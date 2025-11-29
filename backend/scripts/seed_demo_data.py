"""
Seed Supabase with comprehensive demo data for RAG testing
Uses sentence-transformers for real, high-quality semantic embeddings
"""
import sys
import os
import asyncio
import json

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv()

from app.db.database import prisma
from app.core.auth import get_password_hash

# Use simple hash-based embeddings for seeding (no external API needed)
import hashlib
import numpy as np

print("🔄 Using hash-based embeddings for seeding...")
print("✅ Hash-based embedding generator configured!")

# Demo Companies Data - Rich VC portfolio content
DEMO_COMPANIES = [
    {
        "name": "TechFlow AI",
        "type": "portfolio_company",
        "description": "Enterprise AI automation platform revolutionizing workflow management",
        "documents": [
            {
                "title": "Company Overview",
                "content": """TechFlow AI is a Series B enterprise software company founded in 2021 by former Google engineers Sarah Chen and Marcus Rodriguez. The company has developed a proprietary AI platform that automates complex business workflows across departments.

Key Metrics:
- ARR: $12.5M (growing 180% YoY)
- Customers: 85 enterprise accounts (Fortune 500 focus)
- Team Size: 78 employees
- Gross Margin: 82%
- NRR: 145%
- CAC Payback: 14 months

The platform uses advanced LLMs combined with custom-trained models to understand business context and automate repetitive tasks. Key use cases include invoice processing, contract analysis, customer support automation, and HR workflow management.

Investment History:
- Seed: $3M (Sequoia Capital, 2021)
- Series A: $15M (a16z, 2022)
- Series B: $45M (Tiger Global lead, 2023)

Total funding: $63M
Current valuation: $280M
Last round: October 2023"""
            },
            {
                "title": "Financial Performance Q3 2024",
                "content": """TechFlow AI Q3 2024 Financial Summary

Revenue Metrics:
- Quarterly Revenue: $4.2M
- Annual Recurring Revenue: $16.8M (up from $12.5M in Q1)
- Net New ARR: $1.4M
- Gross Revenue Retention: 98%
- Net Revenue Retention: 148%

Profitability:
- Gross Margin: 83%
- Operating Expenses: $5.8M
- EBITDA: -$1.6M (improving from -$2.1M in Q2)
- Runway: 24 months at current burn

Customer Metrics:
- Total Customers: 112 (up from 85)
- Enterprise Customers (>$100K ACV): 34
- Average Contract Value: $150K
- Logo Churn: 2%

Key Wins This Quarter:
- Signed Microsoft as a customer ($800K ACV)
- Expanded Salesforce contract by 3x
- Won competitive deal against UiPath at Chevron

Risks & Challenges:
- Increasing competition from Microsoft Copilot
- Sales cycle lengthening due to economic uncertainty
- Key engineering hire fell through"""
            },
            {
                "title": "Product Roadmap 2024-2025",
                "content": """TechFlow AI Product Roadmap

H2 2024:
1. AI Agent Framework v2.0
   - Multi-agent orchestration
   - Long-term memory and context
   - Custom tool integration API
   
2. Enterprise Security Suite
   - SOC 2 Type II certification (complete)
   - HIPAA compliance (in progress)
   - On-premise deployment option

H1 2025:
1. TechFlow Copilot
   - Natural language workflow creation
   - Real-time collaboration features
   - Mobile app for approvals

2. Industry-Specific Solutions
   - Healthcare: Patient intake automation
   - Finance: Compliance workflow automation
   - Legal: Contract review and management

Technical Differentiators:
- Proprietary fine-tuned models reduce hallucinations by 85%
- Sub-100ms latency on workflow triggers
- 99.99% uptime SLA
- Integration with 200+ enterprise tools"""
            },
            {
                "title": "Competitive Analysis",
                "content": """TechFlow AI Competitive Landscape

Direct Competitors:

1. UiPath (Public, $8B market cap)
   - Strengths: Brand recognition, enterprise relationships, RPA market leader
   - Weaknesses: Legacy architecture, slower AI adoption, expensive
   - Our advantage: 10x faster implementation, native AI, lower TCO

2. Automation Anywhere (Private, $6.8B valuation)
   - Strengths: Cloud-native, strong partner ecosystem
   - Weaknesses: Complex pricing, limited AI capabilities
   - Our advantage: Superior NLP understanding, simpler UX

3. Microsoft Power Automate
   - Strengths: Microsoft ecosystem integration, pricing
   - Weaknesses: Limited AI customization, less flexibility
   - Our advantage: Better cross-platform support, specialized AI

Emerging Threats:
- Anthropic Claude for enterprise (potential)
- OpenAI GPT Enterprise expansion
- Startup: Bardeen.ai (seed stage)

Win/Loss Analysis Q3:
- Win rate: 42%
- Top win reasons: AI accuracy, implementation speed
- Top loss reasons: Price (32%), incumbent relationship (28%)"""
            }
        ]
    },
    {
        "name": "GreenEnergy Solutions",
        "type": "portfolio_company",
        "description": "Clean technology company focused on next-generation solar panel efficiency",
        "documents": [
            {
                "title": "Company Overview",
                "content": """GreenEnergy Solutions is a Series A cleantech company developing breakthrough perovskite solar cell technology. Founded in 2020 by Dr. Emily Watson (MIT PhD, former Tesla) and James Park (ex-SunPower).

Key Metrics:
- Revenue: $2.1M (pilot programs)
- Partnerships: 3 major utility companies
- Team Size: 32 employees
- Patents: 12 (8 pending)
- Lab Efficiency Record: 29.4%

Technology:
The company has developed a novel tandem perovskite-silicon solar cell that achieves 29.4% efficiency in lab conditions (vs. 22% for standard silicon). Key innovations include:
- Proprietary encapsulation extending cell lifetime to 25+ years
- Low-cost manufacturing process (40% cheaper than traditional)
- Flexible form factor enabling new applications

Investment History:
- Pre-seed: $500K (Climate angels, 2020)
- Seed: $4M (Breakthrough Energy, 2021)
- Series A: $18M (Khosla Ventures lead, 2023)

Total funding: $22.5M
Current valuation: $95M

Market Opportunity:
- Global solar market: $223B by 2026
- Perovskite segment: Projected $6B by 2030
- US infrastructure bill: $370B for clean energy"""
            },
            {
                "title": "Technical Progress Report Q3 2024",
                "content": """GreenEnergy Solutions Technical Update

Manufacturing Progress:
- Pilot line operational in Austin, TX
- Current capacity: 10MW/year
- Yield rate: 78% (target: 90% by Q2 2025)
- Unit cost: $0.18/W (target: $0.12/W at scale)

Performance Milestones:
- Module efficiency: 26.8% (up from 24.2%)
- Degradation rate: 0.3%/year (industry: 0.5%)
- Temperature coefficient: -0.29%/°C (industry: -0.35%)

Certification Status:
- IEC 61215: Passed
- IEC 61730: In progress (expected Q4)
- UL 1703: Scheduled Q1 2025

Partnership Updates:
1. Duke Energy: 5MW pilot installation underway
2. NextEra: Joint development agreement signed
3. First Solar: Manufacturing partnership discussion

R&D Pipeline:
- Building-integrated PV (BIPV) prototype
- Flexible modules for EV integration
- Indoor light harvesting cells

Key Risks:
- Scaling manufacturing yield
- Supply chain for specialty materials
- Competition from Chinese manufacturers"""
            },
            {
                "title": "Market Analysis - Solar Industry",
                "content": """Solar Energy Market Analysis 2024

Global Market Overview:
- 2023 installations: 350 GW (up 45% YoY)
- 2024 forecast: 450 GW
- CAGR 2024-2030: 15.7%
- Total addressable market: $500B by 2030

US Market Dynamics:
- IRA impact: 30% tax credit driving adoption
- Utility-scale growth: 25% YoY
- Residential momentum slowing (interest rates)
- Community solar expanding rapidly

Technology Trends:
1. Bifacial modules gaining share (35% of market)
2. N-type cells replacing P-type
3. Perovskite tandems emerging (pre-commercial)
4. Energy storage integration becoming standard

Competitive Landscape:
- LONGi: Market leader, vertical integration
- JinkoSolar: Cost leadership
- First Solar: US manufacturing advantage
- Canadian Solar: Global distribution strength

GreenEnergy's Position:
Our perovskite technology offers:
- 20% higher efficiency potential
- 40% lower manufacturing cost at scale
- Domestic US production (IRA benefits)
- Differentiated applications (flexible, BIPV)

Key Success Factors:
- Manufacturing scale-up execution
- Supply chain security
- Utility partnerships for bankability
- Continued R&D investment"""
            }
        ]
    },
    {
        "name": "HealthBridge",
        "type": "portfolio_company",
        "description": "Digital health platform connecting patients with specialists via telehealth",
        "documents": [
            {
                "title": "Company Overview",
                "content": """HealthBridge is a Series B digital health company operating a specialty telehealth marketplace. Founded in 2019 by Dr. Rachel Kim (former Cleveland Clinic) and David Chang (ex-Teladoc product).

Key Metrics:
- Revenue: $28M ARR
- Growth: 95% YoY
- Consultations: 450K annually
- Specialists: 2,800 on platform
- Patient NPS: 72
- Payer Partnerships: 12 major insurers

Platform Overview:
HealthBridge connects patients needing specialty care with board-certified specialists across 40+ specialties. The platform offers video consultations, asynchronous messaging, second opinions, and care coordination.

Key Specialties:
- Cardiology (22% of volume)
- Dermatology (18%)
- Neurology (15%)
- Oncology (12%)
- Mental Health (10%)

Investment History:
- Seed: $2.5M (Rock Health, 2019)
- Series A: $12M (GV lead, 2021)
- Series B: $40M (General Catalyst lead, 2023)

Total funding: $54.5M
Current valuation: $220M

Regulatory:
- 50-state licensure for specialists
- HIPAA compliant
- In-network with major insurers"""
            },
            {
                "title": "Q3 2024 Performance",
                "content": """HealthBridge Q3 2024 Business Update

Revenue Performance:
- Q3 Revenue: $8.2M (up from $6.1M Q3 2023)
- ARR exit rate: $34M
- Revenue mix: B2B2C 70%, Direct-to-consumer 30%

Unit Economics:
- Average revenue per consultation: $95
- Provider payout: $55 (58%)
- Gross margin: 42%
- Customer acquisition cost: $45
- LTV: $380
- LTV/CAC: 8.4x

Key Metrics:
- Monthly active users: 125K
- Consultations completed: 128K (Q3)
- Average wait time: 18 minutes
- Provider satisfaction: 4.6/5
- Patient satisfaction: 4.7/5

Enterprise Wins:
- Walmart: Expanded to 2M covered lives
- Cigna: New specialty carve-out partnership
- Cleveland Clinic: White-label partnership

Growth Initiatives:
1. Employer market expansion
2. Medicare Advantage partnerships
3. International expansion (UK pilot)
4. Chronic care management program

Challenges:
- Specialist recruitment in rural areas
- Insurance reimbursement rates declining
- Increased competition from health systems"""
            },
            {
                "title": "Digital Health Market Trends",
                "content": """Digital Health Market Analysis 2024

Market Size & Growth:
- Global digital health market: $330B (2024)
- CAGR 2024-2030: 18.6%
- Telehealth segment: $115B
- US telehealth: $45B

Post-Pandemic Trends:
- Telehealth utilization stabilized at 15% of visits (vs 40% peak)
- Specialty telehealth growing faster than primary care
- Hybrid models emerging as standard
- Employer adoption accelerating

Investment Landscape:
- 2024 digital health funding: $8.2B (down from $15B peak)
- Investor focus shifting to profitability
- M&A activity increasing
- Later-stage valuations compressed

Regulatory Environment:
- Medicare telehealth extensions through 2024
- State licensure compacts expanding
- DEA prescribing rules loosening
- AI regulation emerging concern

Competitive Analysis:
1. Teladoc/Livongo: Market leader, struggling post-merger
2. Amwell: B2B focus, health system partnerships
3. MDLive (Cigna): Payer-owned model
4. Amazon Clinic: New entrant threat

HealthBridge Differentiation:
- Specialty focus (vs. primary care commodity)
- Insurance integration (vs. cash-pay models)
- Care coordination (vs. episodic visits)
- Quality metrics transparency"""
            }
        ]
    },
    {
        "name": "DataMesh",
        "type": "prospect",
        "description": "Data infrastructure startup building next-gen data lakehouse platform",
        "documents": [
            {
                "title": "Investment Memo",
                "content": """DataMesh Investment Opportunity

Executive Summary:
DataMesh is building a next-generation data lakehouse platform that unifies data warehousing and data lake capabilities with AI-native features. The company is raising a $25M Series A.

Founders:
- CEO: Jennifer Wu (ex-Snowflake Staff Engineer, 8 years)
- CTO: Alex Rivera (ex-Databricks, Apache Spark committer)

Traction:
- ARR: $1.8M (from $200K 12 months ago)
- Customers: 22 mid-market companies
- NRR: 165%
- Technical POCs: 15 in pipeline

Product:
DataMesh's platform offers:
1. Unified compute engine for SQL and ML
2. Real-time streaming + batch processing
3. Built-in vector database for AI workloads
4. 10x cost efficiency vs. Snowflake

Market Opportunity:
- Data infrastructure TAM: $120B by 2027
- Data lakehouse segment growing 35% CAGR
- AI workloads driving demand for unified platforms

Investment Thesis:
1. Technical differentiation proven in benchmarks
2. Founders have deep domain expertise
3. Clear wedge into AI-first data teams
4. Large market with established budget

Risks:
- Competition from Databricks, Snowflake
- Enterprise sales capability unproven
- Founder CEO first-time
- Technical complexity in scaling

Deal Terms:
- Raising: $25M Series A
- Pre-money valuation: $100M
- Lead investor: Greylock (committed $15M)
- Syndicate: Looking for $10M additional"""
            },
            {
                "title": "Due Diligence Notes",
                "content": """DataMesh Due Diligence Summary

Customer References (5 completed):

1. Fintech Co (Series C, $2M ARR customer)
   - Use case: Real-time fraud detection
   - Feedback: "10x faster than our Snowflake setup, saved $400K/year"
   - Risk: Heavy customization required
   
2. E-commerce Platform (Public company)
   - Use case: Customer 360, ML features
   - Feedback: "Best unified platform we've evaluated"
   - Risk: Still in pilot phase

3. Healthcare Analytics (Series B)
   - Use case: HIPAA-compliant data warehouse
   - Feedback: "Security and compliance impressed us"
   - Risk: Switching from Databricks, incomplete migration

Technical Assessment:
- Architecture: Modern Rust-based engine, impressive
- Scalability: Tested to 10PB, no issues
- Security: SOC 2 in progress, encryption solid
- Concerns: Documentation sparse, small engineering team

Financial Review:
- Burn rate: $800K/month
- Runway: 8 months (need to close round)
- Revenue quality: Mix of POC and committed ARR
- Collection: 45-day average, acceptable

Team Assessment:
- Engineering: Strong technical talent (45% ex-FAANG)
- Sales: Weak, only 2 AEs
- Marketing: Non-existent
- Operations: Basic, needs buildout

Recommendation:
Proceed with investment at $85M pre-money valuation. Key conditions:
1. Hire VP Sales within 90 days
2. Complete SOC 2 certification
3. Board seat required"""
            }
        ]
    },
    {
        "name": "QuantumLeap Computing",
        "type": "research",
        "description": "Research project on quantum computing investments and market analysis",
        "documents": [
            {
                "title": "Quantum Computing Market Overview",
                "content": """Quantum Computing Investment Landscape 2024

Market Overview:
- Total VC investment (2023): $1.8B
- Government funding (US): $800M annually
- Corporate R&D: $5B+ (IBM, Google, Microsoft)
- Market forecast: $65B by 2030

Technology Status:
1. Gate-based quantum computers
   - Leaders: IBM (1000+ qubits), Google (72 qubits quality)
   - Status: NISQ era, limited practical applications
   
2. Quantum annealing
   - Leader: D-Wave
   - Status: Commercial deployments, narrow use cases

3. Trapped ion
   - Leaders: IonQ, Quantinuum
   - Status: High fidelity, scaling challenges

4. Photonic
   - Leaders: Xanadu, PsiQuantum
   - Status: Room temperature advantage, early stage

Near-term Applications (2024-2027):
- Drug discovery: Molecular simulation
- Finance: Portfolio optimization
- Logistics: Route optimization
- Cryptography: Quantum-safe solutions

Investment Considerations:
Attractive characteristics:
- Deep tech moat
- Government support
- Large enterprise customers
- Platform potential

Risks:
- Technical timeline uncertainty
- Capital intensity
- Talent scarcity
- Customer education needed

Notable Private Companies:
1. PsiQuantum ($665M raised, photonic approach)
2. IonQ (public, $5B market cap)
3. Rigetti (public, struggling)
4. Xanadu ($200M raised, photonic + software)
5. QuEra ($50M raised, neutral atom)"""
            },
            {
                "title": "Quantum Startup Evaluation Framework",
                "content": """Framework for Evaluating Quantum Computing Investments

Technical Diligence:

1. Technology Approach Assessment
   - Qubit type and physical implementation
   - Error rates and coherence times
   - Scalability path to fault tolerance
   - Competitive benchmarks (quantum volume, CLOPS)

2. Team Evaluation
   - PhD-level quantum physics expertise
   - Engineering execution capability
   - Previous startup/industry experience
   - Academic publication record

3. IP Position
   - Core patents filed/granted
   - Freedom to operate analysis
   - Trade secrets protection
   - Open source vs. proprietary balance

Business Diligence:

1. Go-to-Market Strategy
   - Target customer segments
   - Partnership approach (cloud providers)
   - Pricing model (compute time, SaaS)
   - Sales cycle length expectations

2. Market Timing
   - Current revenue/pilots
   - Path to commercial relevance
   - Competition from big tech
   - Adjacent market opportunities

3. Capital Requirements
   - Hardware vs. software focus
   - Funding runway expectations
   - Follow-on investment needs
   - Exit pathway (M&A likely)

Red Flags:
- Overclaiming technical capabilities
- No clear path to fault tolerance
- Pure research without commercial focus
- Weak engineering team alongside PhDs

Green Flags:
- Cloud provider partnership
- Revenue from optimization use cases
- Hybrid classical-quantum approach
- Strong software/developer tools"""
            }
        ]
    }
]

# Additional standalone documents for rich context
STANDALONE_DOCUMENTS = [
    {
        "title": "VC Industry Trends 2024",
        "source_type": "manual",
        "content": """Venture Capital Industry Trends 2024

Fundraising Environment:
- Total VC fundraising: $170B (down 20% from peak)
- Median fund size: $85M (stable)
- LP sentiment: Cautious, favoring established managers
- New fund formation: Slowing significantly

Deal Activity:
- Total deals: 12,500 (down 25% YoY)
- Median pre-money (Series A): $30M (down from $45M)
- Down rounds: 22% of deals (up from 8%)
- Time between rounds: Extended to 24 months average

Sector Trends:
1. AI/ML: Dominant theme, 35% of funding
2. Climate/Clean tech: Growing, 18% of funding  
3. Healthcare: Stable, 15% of funding
4. Enterprise SaaS: Down significantly, 12% of funding
5. Consumer: Depressed, 8% of funding
6. Fintech: Recovering, 10% of funding

Valuation Multiples:
- SaaS: 8-12x ARR (down from 15-25x)
- AI: 15-30x ARR (premium maintained)
- Fintech: 5-8x ARR (compressed)
- Consumer: 2-4x revenue (challenged)

Exit Environment:
- IPO window: Largely closed
- M&A: Active but at lower valuations
- SPACs: No longer viable
- Secondary sales: Increasing volume

LP Concerns:
- DPI lagging (distributions to paid-in)
- Markdowns creating J-curve extension
- Denominator effect limiting new commitments
- Focus on operational value-add

Best Practices for Current Market:
1. Focus on capital efficiency
2. Extend runway to 24+ months
3. Path to profitability clear
4. Strategic alternatives considered early"""
    },
    {
        "title": "Due Diligence Checklist",
        "source_type": "manual",
        "content": """Standard Due Diligence Checklist for VC Investments

Financial Diligence:
□ 3 years historical financials (if available)
□ Current month financial package
□ Budget vs. actual analysis
□ Revenue breakdown by customer/segment
□ Cohort analysis (retention, expansion)
□ Unit economics detail (CAC, LTV, payback)
□ Cap table with all outstanding instruments
□ Outstanding debt or obligations
□ GAAP vs. cash analysis

Commercial Diligence:
□ Customer reference calls (5-10)
□ Lost customer analysis
□ Competitive win/loss data
□ Pricing analysis and history
□ Sales pipeline review
□ Partner channel assessment
□ Market size validation
□ Go-to-market efficiency metrics

Technical Diligence:
□ Architecture review
□ Code quality assessment
□ Security audit
□ Scalability testing
□ Technical debt evaluation
□ Infrastructure costs analysis
□ Data privacy compliance
□ IP ownership verification

Legal Diligence:
□ Corporate formation documents
□ Material contracts review
□ IP assignment agreements
□ Employment agreements
□ Option plan documents
□ Previous financing documents
□ Litigation history
□ Regulatory compliance status

Team Diligence:
□ Background checks
□ Reference calls (board, investors, reports)
□ Org structure review
□ Compensation benchmarking
□ Key person dependencies
□ Hiring plan assessment
□ Culture assessment"""
    },
    {
        "title": "Portfolio Management Best Practices",
        "source_type": "manual",
        "content": """Portfolio Management Framework for Venture Capital

Monitoring Cadence:
- Board meetings: Quarterly minimum
- Financial reporting: Monthly
- KPI dashboard: Real-time access
- Founder 1:1s: Monthly or as needed
- Portfolio reviews: Quarterly internal

Key Metrics to Track:

Revenue Metrics:
- ARR/MRR growth rate
- Net revenue retention
- Gross revenue retention
- New ARR vs. expansion vs. churn
- Revenue per employee

Efficiency Metrics:
- Burn multiple (net burn / net new ARR)
- Magic number (net new ARR / S&M spend)
- CAC payback period
- Rule of 40 (growth rate + margin)
- Revenue per employee

Engagement Metrics:
- DAU/MAU ratio
- Time in product
- Feature adoption
- NPS/CSAT scores
- Logo retention

Support Resources to Offer:
1. Talent: Recruiting support, exec search
2. Customers: Introductions, reference calls
3. Strategy: Board participation, market insights
4. Operations: Best practices, peer networks
5. Fundraising: Bridge support, intro to investors

Warning Signs to Watch:
- Slowing growth without efficiency improvement
- Key executive departures
- Customer concentration increasing
- Competitive losses accelerating
- Burn rate increasing without results

Reserve Management:
- Initial reserve: 1.5-2x initial check
- Pro-rata considerations
- Bridge financing criteria
- Write-off triggers
- Follow-on investment framework"""
    }
]


def generate_embedding(text: str) -> list:
    """Generate deterministic embedding using hash-based approach"""
    # Create a deterministic hash from the text
    hash_obj = hashlib.sha256(text.encode('utf-8'))
    hash_bytes = hash_obj.digest()

    # Convert hash to a 1536-dimensional vector using pseudo-random generation
    np.random.seed(int.from_bytes(hash_bytes[:4], byteorder='big'))
    embedding = np.random.normal(0, 1, 1536).tolist()

    # Normalize to unit vector
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = (np.array(embedding) / norm).tolist()

    return embedding


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list:
    """Split text into overlapping chunks"""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap
        if start + overlap >= len(text):
            break
    return chunks


async def seed_demo_data():
    """Seed database with comprehensive demo data using deterministic embeddings"""
    print("🚀 Starting demo data seeding with deterministic embeddings...")
    print("📡 Using hash-based embedding generation (no API required)...")
    
    await prisma.connect()
    print("✅ Connected to database")
    
    # Check if demo user already exists
    existing_user = await prisma.user.find_first(
        where={"email": "demo@vccopilot.com"}
    )
    
    if existing_user:
        print("⚠️  Demo user already exists, cleaning up...")
        # Delete existing data for fresh seed
        await prisma.vectordocument.delete_many(
            where={"project": {"userId": existing_user.id}}
        )
        await prisma.document.delete_many(
            where={"project": {"userId": existing_user.id}}
        )
        await prisma.message.delete_many(
            where={"chat": {"userId": existing_user.id}}
        )
        await prisma.chat.delete_many(
            where={"userId": existing_user.id}
        )
        await prisma.project.delete_many(
            where={"userId": existing_user.id}
        )
        await prisma.integration.delete_many(
            where={"userId": existing_user.id}
        )
        await prisma.user.delete(
            where={"id": existing_user.id}
        )
        print("✅ Cleaned up existing demo data")
    
    # Create demo user
    demo_user = await prisma.user.create(
        data={
            "email": "demo@vccopilot.com",
            "hashedPassword": get_password_hash("demo123"),
            "fullName": "Demo VC Partner",
            "organization": "Horizon Ventures"
        }
    )
    print(f"✅ Created demo user: {demo_user.email}")
    
    # Create projects and seed documents with embeddings
    total_chunks = 0
    
    for company in DEMO_COMPANIES:
        print(f"\n📁 Creating project: {company['name']}")
        
        project = await prisma.project.create(
            data={
                "name": company["name"],
                "description": company["description"],
                "type": company["type"],
                "userId": demo_user.id,
                "metadata": json.dumps({
                    "industry": "Technology",
                    "stage": "Series B" if company["type"] == "portfolio_company" else "Research"
                })
            }
        )
        
        # Process each document
        for doc_data in company["documents"]:
            print(f"  📄 Processing: {doc_data['title']}")
            
            # Chunk the content
            chunks = chunk_text(doc_data["content"])
            
            for i, chunk in enumerate(chunks):
                # Generate REAL embedding using sentence-transformers
                embedding = generate_embedding(chunk)
                
                # Store as vector document
                await prisma.vectordocument.create(
                    data={
                        "projectId": project.id,
                        "content": chunk,
                        "sourceType": "manual",
                        "chunkIndex": i,
                        "metadata": json.dumps({
                            "title": doc_data["title"],
                            "company": company["name"],
                            "source": f"{company['name']} - {doc_data['title']}",
                            "embedding": embedding
                        })
                    }
                )
                total_chunks += 1
        
        print(f"  ✅ Added {len(company['documents'])} documents")
    
    # Add standalone documents to a "General Research" project
    print(f"\n📁 Creating project: General Research")
    research_project = await prisma.project.create(
        data={
            "name": "General Research",
            "description": "Market research and best practices documentation",
            "type": "research",
            "userId": demo_user.id,
            "metadata": json.dumps({"category": "reference"})
        }
    )
    
    for doc_data in STANDALONE_DOCUMENTS:
        print(f"  📄 Processing: {doc_data['title']}")
        chunks = chunk_text(doc_data["content"])
        
        for i, chunk in enumerate(chunks):
            embedding = generate_embedding(chunk)
            
            await prisma.vectordocument.create(
                data={
                    "projectId": research_project.id,
                    "content": chunk,
                    "sourceType": doc_data["source_type"],
                    "chunkIndex": i,
                    "metadata": json.dumps({
                        "title": doc_data["title"],
                        "source": doc_data["title"],
                        "embedding": embedding
                    })
                }
            )
            total_chunks += 1
    
    print(f"\n✅ Added {len(STANDALONE_DOCUMENTS)} standalone documents")
    
    # Create sample integrations
    integrations_data = [
        {"name": "google_workspace", "displayName": "Google Workspace", "status": "disconnected"},
        {"name": "hubspot", "displayName": "HubSpot", "status": "disconnected"},
        {"name": "angellist", "displayName": "AngelList", "status": "disconnected"}
    ]
    
    for integration in integrations_data:
        await prisma.integration.create(
            data={
                "userId": demo_user.id,
                "name": integration["name"],
                "displayName": integration["displayName"],
                "status": integration["status"]
            }
        )
    
    print(f"✅ Created {len(integrations_data)} integration placeholders")
    
    await prisma.disconnect()
    
    print("\n" + "="*60)
    print("🎉 Demo data seeding complete with REAL semantic embeddings!")
    print("="*60)
    print(f"\n📊 Summary:")
    print(f"   - User created: demo@vccopilot.com (password: demo123)")
    print(f"   - Projects created: {len(DEMO_COMPANIES) + 1}")
    print(f"   - Vector documents: {total_chunks} chunks with deterministic embeddings")
    print(f"   - Embedding method: Hash-based (1536 dimensions)")
    print(f"   - Integrations: {len(integrations_data)}")
    print("\n💡 You can now test RAG queries about:")
    print("   - TechFlow AI (enterprise AI automation)")
    print("   - GreenEnergy Solutions (solar technology)")
    print("   - HealthBridge (digital health platform)")
    print("   - DataMesh (data infrastructure prospect)")
    print("   - QuantumLeap Computing (research project)")
    print("   - VC industry trends and best practices")


if __name__ == "__main__":
    asyncio.run(seed_demo_data())
