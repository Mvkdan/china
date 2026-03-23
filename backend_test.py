import requests
import sys
import json
from datetime import datetime

class ChinaStudyAPITester:
    def __init__(self, base_url="https://supabase-refactor-3.preview.emergentagent.com"):
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
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

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

        # Test document types - should return 14 types now
        success, response = self.run_test(
            "Get Document Types",
            "GET",
            "document-types",
            200
        )
        if success and len(response) == 14:
            print(f"   ✅ Found exactly {len(response)} document types (expected 14)")
            # Check for specific document types
            doc_types = [doc['id'] for doc in response]
            expected_types = ['passport_scan', 'id_photo', 'diploma', 'criminal_record', 'medical_certificate']
            bulletin_types = [f'bulletin_{level}_{term}' for level in ['2nde', '1ere', 'terminale'] for term in ['1', '2', '3']]
            expected_types.extend(bulletin_types)
            
            missing_types = [t for t in expected_types if t not in doc_types]
            if missing_types:
                print(f"   ⚠️  Missing document types: {missing_types}")
            else:
                print("   ✅ All expected document types present")
        elif success:
            print(f"   ❌ Expected exactly 14 document types, got {len(response)}")
            print(f"   Document types found: {[doc['id'] for doc in response]}")

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

        # Update application step - Identity
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
            print("   Identity step update successful")

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

        # Update contacts step - NEW FORMAT with phone_code and phone_number
        success, response = self.run_test(
            "Update Application - Contacts (New Format)",
            "PUT",
            "application",
            200,
            data={
                "step": "contacts",
                "data": {
                    "current_address": "123 Test St",
                    "permanent_address": "456 Home St",
                    "phone_code": "+33",
                    "phone_number": "123456789"
                }
            },
            headers=headers
        )

        # Update emergency contact - NEW FORMAT with nom/prénom split and phone_code
        success, response = self.run_test(
            "Update Application - Emergency Contact (New Format)",
            "PUT",
            "application",
            200,
            data={
                "step": "emergency_contact",
                "data": {
                    "last_name": "Emergency",
                    "first_name": "Contact",
                    "relationship": "Père",
                    "phone_code": "+33",
                    "phone_number": "987654321",
                    "email": "emergency@test.com"
                }
            },
            headers=headers
        )

        # Test emergency contact with "Autre" relationship
        success, response = self.run_test(
            "Update Application - Emergency Contact with Autre",
            "PUT",
            "application",
            200,
            data={
                "step": "emergency_contact",
                "data": {
                    "last_name": "Emergency",
                    "first_name": "Contact",
                    "relationship": "Autre",
                    "relationship_other": "Tuteur légal",
                    "phone_code": "+33",
                    "phone_number": "987654321",
                    "email": "emergency@test.com"
                }
            },
            headers=headers
        )

        # Update financial guarantor - NEW FORMAT with nom/prénom split, profession, and phone_code
        success, response = self.run_test(
            "Update Application - Financial Guarantor (New Format)",
            "PUT",
            "application",
            200,
            data={
                "step": "financial_guarantor",
                "data": {
                    "last_name": "Guarantor",
                    "first_name": "Financial",
                    "relationship": "Père",
                    "profession": "Ingénieur",
                    "phone_code": "+33",
                    "phone_number": "555666777"
                }
            },
            headers=headers
        )

        # Update family - NEW FORMAT with separate nom/prénom for father and mother
        success, response = self.run_test(
            "Update Application - Family (New Format)",
            "PUT",
            "application",
            200,
            data={
                "step": "family",
                "data": {
                    "father_last_name": "Father",
                    "father_first_name": "Test",
                    "father_age": "50",
                    "father_profession": "Engineer",
                    "mother_last_name": "Mother",
                    "mother_first_name": "Test",
                    "mother_age": "48",
                    "mother_profession": "Teacher"
                }
            },
            headers=headers
        )

        # Verify that university step is NOT accepted (should be removed)
        success, response = self.run_test(
            "Update Application - University Step (Should Fail)",
            "PUT",
            "application",
            400,  # Should fail because university step is removed
            data={
                "step": "university",
                "data": {
                    "id": "blcu",
                    "name": "Beijing Language and Culture University (BLCU)",
                    "city": "Beijing"
                }
            },
            headers=headers
        )

        if not success:
            print("   ✅ University step correctly rejected (step removed from wizard)")

        return True

    def test_document_operations(self):
        """Test document upload and management"""
        print("\n=== Testing Document Operations ===")
        
        if not self.student_token:
            print("   ❌ No student token available")
            return False

        headers = {'Authorization': f'Bearer {self.student_token}'}

        # Create test file content
        test_file_content = b"Test document content for passport scan"
        
        # Test document upload
        success, response = self.run_test(
            "Upload Document - Passport",
            "POST",
            "documents/upload",
            200,
            data={"doc_type": "passport_scan"},
            files={"file": ("test_passport.pdf", test_file_content, "application/pdf")},
            headers={'Authorization': f'Bearer {self.student_token}'}
        )

        doc_id = None
        if success:
            doc_id = response.get('id')
            print(f"   Document uploaded with ID: {doc_id}")

        # Test multiple diploma uploads (should not replace previous)
        diploma_ids = []
        for i in range(3):
            success, response = self.run_test(
                f"Upload Multiple Diplomas - Diploma {i+1}",
                "POST",
                "documents/upload",
                200,
                data={"doc_type": "diploma"},
                files={"file": (f"test_diploma_{i+1}.pdf", test_file_content, "application/pdf")},
                headers={'Authorization': f'Bearer {self.student_token}'}
            )
            if success:
                diploma_ids.append(response.get('id'))

        # Test get documents
        success, response = self.run_test(
            "Get Documents",
            "GET",
            "documents",
            200,
            headers=headers
        )

        if success:
            print(f"   Found {len(response)} documents")
            diploma_docs = [doc for doc in response if doc['doc_type'] == 'diploma']
            print(f"   Found {len(diploma_docs)} diploma documents")
            if len(diploma_docs) >= 3:
                print("   ✅ Multiple diploma uploads working correctly")

        # Test document deletion (new endpoint)
        if doc_id:
            success, response = self.run_test(
                "Delete Document",
                "DELETE",
                f"documents/{doc_id}",
                200,
                headers=headers
            )
            if success:
                print("   ✅ Document deletion working")

        return True

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

        # Test university assignment (new endpoint)
        if self.student_id:
            success, response = self.run_test(
                "Assign University to Student",
                "PUT",
                f"admin/students/{self.student_id}/university",
                200,
                data={
                    "university_id": "blcu",
                    "university_name": "Beijing Language and Culture University (BLCU)",
                    "university_city": "Beijing"
                },
                headers=headers
            )

            if success:
                print("   ✅ University assignment working")

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