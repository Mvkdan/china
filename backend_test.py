import requests
import sys
import json
from datetime import datetime

class ChinaStudyAPITester:
    def __init__(self, base_url="https://dossier-flow-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.student_token = None
        self.admin_token = None
        self.student_id = None
        self.application_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for multipart
                    test_headers.pop('Content-Type', None)
                    response = requests.post(url, data=data, files=files, headers=test_headers)
                else:
                    response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_reference_data(self):
        """Test reference data endpoints"""
        print("\n=== Testing Reference Data ===")
        
        # Test universities
        success, response = self.run_test(
            "Get Universities",
            "GET",
            "universities",
            200
        )
        if success and len(response) >= 10:
            print(f"   Found {len(response)} universities")
        elif success:
            print(f"   ⚠️  Expected 10+ universities, got {len(response)}")

        # Test document types
        success, response = self.run_test(
            "Get Document Types",
            "GET",
            "document-types",
            200
        )
        if success and len(response) >= 6:
            print(f"   Found {len(response)} document types")
        elif success:
            print(f"   ⚠️  Expected 6+ document types, got {len(response)}")

    def test_student_auth(self):
        """Test student authentication"""
        print("\n=== Testing Student Authentication ===")
        
        # Generate unique email for testing
        timestamp = datetime.now().strftime('%H%M%S')
        test_email = f"test_student_{timestamp}@test.com"
        test_password = "TestPass123!"
        
        # Test registration
        success, response = self.run_test(
            "Student Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": test_password,
                "first_name": "Test",
                "last_name": "Student"
            }
        )
        
        if success and 'token' in response:
            self.student_token = response['token']
            self.student_id = response['user']['id']
            print(f"   Student registered with ID: {self.student_id}")
        else:
            print("   ❌ Student registration failed")
            return False

        # Test login
        success, response = self.run_test(
            "Student Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": test_email,
                "password": test_password
            }
        )
        
        if success and 'token' in response:
            print("   Student login successful")
        else:
            print("   ❌ Student login failed")
            return False

        # Test auth/me
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200,
            headers={'Authorization': f'Bearer {self.student_token}'}
        )
        
        if success and response.get('role') == 'student':
            print("   Auth verification successful")
            return True
        else:
            print("   ❌ Auth verification failed")
            return False

    def test_admin_auth(self):
        """Test admin authentication"""
        print("\n=== Testing Admin Authentication ===")
        
        # Test admin login
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": "admin@chinastudy.com",
                "password": "admin123"
            }
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            print("   Admin login successful")
            return True
        else:
            print("   ❌ Admin login failed")
            return False

    def test_application_flow(self):
        """Test application CRUD operations"""
        print("\n=== Testing Application Flow ===")
        
        if not self.student_token:
            print("   ❌ No student token available")
            return False

        headers = {'Authorization': f'Bearer {self.student_token}'}

        # Get initial application
        success, response = self.run_test(
            "Get Application",
            "GET",
            "application",
            200,
            headers=headers
        )
        
        if success:
            self.application_id = response.get('id')
            print(f"   Application ID: {self.application_id}")

        # Update application step
        success, response = self.run_test(
            "Update Application - Identity",
            "PUT",
            "application",
            200,
            data={
                "step": "identity",
                "data": {
                    "first_name": "Test",
                    "last_name": "Student",
                    "passport_number": "TEST123456",
                    "nationality": "French",
                    "gender": "Masculin",
                    "date_of_birth": "1995-01-01"
                }
            },
            headers=headers
        )

        if success:
            print("   Application update successful")

        # Update education step
        success, response = self.run_test(
            "Update Application - Education",
            "PUT",
            "application",
            200,
            data={
                "step": "education",
                "data": {
                    "highest_degree": "Master",
                    "institution_name": "Test University",
                    "chinese_level": "HSK 3",
                    "english_level": "Avancé"
                }
            },
            headers=headers
        )

        # Update other required steps
        for step_name, step_data in [
            ("contacts", {"current_address": "123 Test St", "phone": "+33123456789"}),
            ("emergency_contact", {"name": "Emergency Contact", "relationship": "Père", "phone": "+33987654321", "email": "emergency@test.com"}),
            ("financial_guarantor", {"name": "Guarantor", "relationship": "Père", "phone": "+33555666777"}),
            ("family", {"father_name": "Father", "father_age": "50", "mother_name": "Mother", "mother_age": "48"}),
            ("university", {"id": "blcu", "name": "Beijing Language and Culture University (BLCU)", "city": "Beijing"})
        ]:
            self.run_test(
                f"Update Application - {step_name.title()}",
                "PUT",
                "application",
                200,
                data={"step": step_name, "data": step_data},
                headers=headers
            )

        return True

    def test_document_operations(self):
        """Test document upload and management"""
        print("\n=== Testing Document Operations ===")
        
        if not self.student_token:
            print("   ❌ No student token available")
            return False

        headers = {'Authorization': f'Bearer {self.student_token}'}

        # Create a test file
        test_file_content = b"Test document content for passport scan"
        
        # Test document upload
        success, response = self.run_test(
            "Upload Document",
            "POST",
            "documents/upload",
            200,
            data={"doc_type": "passport_scan"},
            files={"file": ("test_passport.pdf", test_file_content, "application/pdf")},
            headers={'Authorization': f'Bearer {self.student_token}'}
        )

        if success:
            doc_id = response.get('id')
            print(f"   Document uploaded with ID: {doc_id}")

            # Test get documents
            success, response = self.run_test(
                "Get Documents",
                "GET",
                "documents",
                200,
                headers=headers
            )

            if success and len(response) > 0:
                print(f"   Found {len(response)} documents")
                return True

        return False

    def test_admin_operations(self):
        """Test admin operations"""
        print("\n=== Testing Admin Operations ===")
        
        if not self.admin_token:
            print("   ❌ No admin token available")
            return False

        headers = {'Authorization': f'Bearer {self.admin_token}'}

        # Test get all students
        success, response = self.run_test(
            "Get All Students (Admin)",
            "GET",
            "admin/students",
            200,
            headers=headers
        )

        if success:
            print(f"   Found {len(response)} students")

        # Test get specific student
        if self.student_id:
            success, response = self.run_test(
                "Get Student Detail (Admin)",
                "GET",
                f"admin/students/{self.student_id}",
                200,
                headers=headers
            )

            if success:
                print("   Student detail retrieved successfully")

        return True

    def test_payment_flow(self):
        """Test payment operations"""
        print("\n=== Testing Payment Flow ===")
        
        if not self.student_token:
            print("   ❌ No student token available")
            return False

        headers = {'Authorization': f'Bearer {self.student_token}'}

        # Note: We can't test actual payment creation without proper status
        # But we can test the endpoint structure
        success, response = self.run_test(
            "Create Payment Session (Expected to fail - wrong status)",
            "POST",
            "payments/create-session",
            400,  # Expected to fail because status is not Awaiting_Payment
            data={"origin_url": "https://test.com"},
            headers=headers
        )

        if not success and response:
            print("   Payment creation correctly rejected (wrong status)")
            return True

        return False

def main():
    print("🚀 Starting ChinaStudy Platform API Tests")
    print("=" * 50)
    
    tester = ChinaStudyAPITester()
    
    # Run all tests
    tester.test_reference_data()
    
    if tester.test_student_auth():
        tester.test_application_flow()
        tester.test_document_operations()
        tester.test_payment_flow()
    
    if tester.test_admin_auth():
        tester.test_admin_operations()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())