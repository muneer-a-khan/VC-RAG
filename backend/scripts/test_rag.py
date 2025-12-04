"""
Test script for RAG integration
Tests the RAG pipeline with various queries against demo data
"""
import sys
import os
import asyncio
import json
import httpx

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv()

# Test queries for RAG
TEST_QUERIES = [
    # Company-specific queries
    {
        "query": "What is TechFlow AI's current ARR and growth rate?",
        "expected_topics": ["ARR", "growth", "TechFlow"]
    },
    {
        "query": "Tell me about GreenEnergy Solutions' solar technology and efficiency achievements",
        "expected_topics": ["solar", "perovskite", "efficiency"]
    },
    {
        "query": "What are the key metrics for HealthBridge's digital health platform?",
        "expected_topics": ["revenue", "consultations", "NPS"]
    },
    {
        "query": "What is the investment thesis for DataMesh?",
        "expected_topics": ["data lakehouse", "Series A", "founders"]
    },
    
    # Cross-company queries
    {
        "query": "Compare the revenue metrics across our portfolio companies",
        "expected_topics": ["ARR", "revenue", "growth"]
    },
    {
        "query": "What are the main competitive risks our portfolio companies face?",
        "expected_topics": ["competition", "risk", "threat"]
    },
    
    # Industry/Research queries
    {
        "query": "What are the current trends in VC valuations and deal activity?",
        "expected_topics": ["valuation", "Series A", "down rounds"]
    },
    {
        "query": "What should I look for in due diligence for a new investment?",
        "expected_topics": ["diligence", "financial", "commercial"]
    },
    {
        "query": "What are best practices for portfolio management?",
        "expected_topics": ["monitoring", "metrics", "board"]
    },
    
    # Specific data queries
    {
        "query": "What is TechFlow AI's Q3 2024 financial performance?",
        "expected_topics": ["Q3", "revenue", "EBITDA"]
    },
    {
        "query": "What companies did TechFlow AI sign as customers recently?",
        "expected_topics": ["Microsoft", "Salesforce", "customers"]
    }
]


async def test_rag_direct():
    """Test RAG using direct service calls"""
    print("=" * 60)
    print("🧪 Testing RAG Service Directly")
    print("=" * 60)
    
    from app.db.database import prisma
    from app.services.rag_service import rag_service
    
    await prisma.connect()
    
    for i, test in enumerate(TEST_QUERIES, 1):
        query = test["query"]
        print(f"\n📝 Query {i}: {query}")
        print("-" * 50)
        
        # Perform similarity search
        results = await rag_service.similarity_search(
            query=query,
            top_k=3
        )
        
        if results:
            print(f"✅ Found {len(results)} relevant documents:")
            for j, result in enumerate(results, 1):
                source = result.get("metadata", {}).get("source", "Unknown")
                similarity = result.get("similarity", 0)
                content_preview = result.get("content", "")[:150]
                print(f"\n   {j}. [{similarity:.3f}] {source}")
                print(f"      '{content_preview}...'")
            
            # Generate response
            response = await rag_service.generate_response(
                query=query,
                context=results
            )
            
            print(f"\n🤖 Response:")
            print(f"   {response['response'][:500]}...")
            print(f"\n   Sources used: {len(response['sources'])}")
        else:
            print("❌ No relevant documents found")
        
        print()
    
    await prisma.disconnect()


async def test_rag_api(base_url: str = "http://localhost:8000"):
    """Test RAG via API endpoints"""
    print("=" * 60)
    print("🧪 Testing RAG via API")
    print("=" * 60)
    
    async with httpx.AsyncClient() as client:
        # First, login to get auth token (OAuth2 form data format)
        print("\n📝 Logging in as demo user...")
        login_response = await client.post(
            f"{base_url}/api/v1/auth/login",
            data={
                "username": "demo@vccopilot.com",  # OAuth2 uses 'username' field
                "password": "demo123"
            }
        )
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.text}")
            return
        
        token = login_response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login successful")
        
        # Test the RAG query endpoint
        for i, test in enumerate(TEST_QUERIES[:5], 1):  # Test first 5 queries via API
            query = test["query"]
            print(f"\n📝 Query {i}: {query}")
            print("-" * 50)
            
            response = await client.post(
                f"{base_url}/api/v1/chat/query",
                json={"query": query, "top_k": 3},
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Response received:")
                print(f"   Answer: {data['answer'][:300]}...")
                print(f"   Sources: {len(data['sources'])}")
                print(f"   Context chunks used: {data['context_used']}")
            else:
                print(f"❌ API error: {response.status_code} - {response.text}")
        
        # Test chat message endpoint
        print("\n" + "=" * 60)
        print("🧪 Testing Chat Message Endpoint")
        print("=" * 60)
        
        chat_query = "What are the financial metrics for TechFlow AI and how do they compare to industry standards?"
        print(f"\n📝 Chat Query: {chat_query}")
        
        response = await client.post(
            f"{base_url}/api/v1/chat/message",
            json={"message": chat_query},
            headers=headers,
            timeout=30.0
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Chat Response:")
            print(f"   Chat ID: {data['chat_id']}")
            print(f"   Message: {data['message'][:400]}...")
            print(f"   Sources: {json.dumps(data['sources'], indent=2)}")
        else:
            print(f"❌ Chat error: {response.status_code} - {response.text}")


async def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Test RAG Integration")
    parser.add_argument("--api", action="store_true", help="Test via API (server must be running)")
    parser.add_argument("--url", default="http://localhost:8000", help="API base URL")
    args = parser.parse_args()
    
    if args.api:
        await test_rag_api(args.url)
    else:
        await test_rag_direct()
    
    print("\n" + "=" * 60)
    print("🎉 RAG Testing Complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

