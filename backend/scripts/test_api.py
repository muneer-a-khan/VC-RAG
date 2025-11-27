"""
Simple API test script
Tests basic endpoints to verify setup
"""
import requests
import sys

API_URL = "http://localhost:8000"


def test_health():
    """Test health check endpoint"""
    try:
        response = requests.get(f"{API_URL}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to API. Is the server running?")
        return False


def test_root():
    """Test root endpoint"""
    try:
        response = requests.get(f"{API_URL}/")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Root endpoint: {data['message']} (v{data['version']})")
            return True
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_docs():
    """Check if docs are accessible"""
    try:
        response = requests.get(f"{API_URL}/docs")
        if response.status_code == 200:
            print(f"✅ API docs available at: {API_URL}/docs")
            return True
        else:
            print(f"❌ API docs not accessible")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


if __name__ == "__main__":
    print("🧪 Testing VC Copilot API...\n")
    
    tests = [
        test_health,
        test_root,
        test_docs
    ]
    
    results = [test() for test in tests]
    
    print(f"\n📊 Results: {sum(results)}/{len(results)} tests passed")
    
    if all(results):
        print("✅ All tests passed! API is running correctly.")
        sys.exit(0)
    else:
        print("❌ Some tests failed. Check the output above.")
        sys.exit(1)

