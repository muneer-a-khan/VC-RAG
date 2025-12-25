import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"

const features = [
  {
    icon: "database",
    title: "Unified Data Aggregation",
    description: "Connect CRM, pitch decks, and market data in one central hub for holistic analysis.",
  },
  {
    icon: "psychology",
    title: "AI-Powered Due Diligence",
    description: "Automated risk scoring and market analysis to identify red flags instantly.",
  },
  {
    icon: "chat_bubble",
    title: "Natural Language Querying",
    description: "Ask complex questions about your deal flow or portfolio performance in plain English.",
  },
  {
    icon: "pie_chart",
    title: "Intelligent Portfolio Management",
    description: "Real-time tracking of portfolio health with automated reporting and smart alerts.",
  },
]

const testimonials = [
  {
    quote: "VC Copilot has cut our due diligence time by 60%. The AI insights catch things we used to miss manually. It&apos;s a game changer.",
    name: "Sarah Jenkins",
    title: "General Partner, Apex Ventures",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBVrrcX2onWIV31ojr9A1pqgyo7ElC0iU8xEMqO4857cEhLgHyDLESwnW7Z5lts9FouauJ6hPGrE8pCgzGdWsPXKc79NVfN99PYvd0WhBnlI3aNzYjuZFrugtMpaW3CEirlG0wUCeJ_0smJabF8f6fMB7TSeHr1MWiQcqvcgt247YkSaSDKViEQEeWrQ_gNdWgl7YZu9-RFVvKaIA7LyBPJA6fx9odWOJnjCcZWjhXkC7lhcj_7JMP3teWZzc-ipbXI2QnDvpquHJKN",
  },
  {
    quote: "The ability to query our entire deal history with natural language is incredible. It&apos;s like having a super-analyst available 24/7.",
    name: "Michael Chen",
    title: "Managing Director, NextGen Cap",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB4UFIqxJwYDxBMSMFNT7-Y0EuZzp_Phgn7XlJ-wJndeKS6hTdHZQmp3cVw9pyzSKR1JLf49t_IufdZSfDM2cqsc6JdkfMBaIQUg21d2GPBWNWm1qJEghuzI7j95bL5j2dKqRLIvf_zvenAwRiY0L6FDNDdp0dGAwwV841ycXPnOsg-YitYb96sjotE1todaSMpJXcFM678BXAHecYB7YI54apZSRoxlnb3-jOokXW3UzQl9aRWoQI0xk10GWR-mynSjWyI0nYRdra_",
  },
  {
    quote: "Finally, a tool that understands the nuance of venture. The portfolio monitoring alerts have saved us from two potential write-offs.",
    name: "Elena Rodriguez",
    title: "Principal, Vista Funds",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBd-XyX8qazLAHdHnC0ZyxmoYlcWTVGyfbETzQHR0p2jkDbdP2h5TRJY_Epldbweoj7Bmrsz-jip1zpIAeh77V-21OVWdmxprjnRRKmOALnfr9z0K6M4eOCj_Ov3LPMfrvRmO4PrhZ3Gm122jooR1E_paj2E0VwuZBIFgugCaA5G5TxEEN4THEslap83y3hM_m8LNG33GCLy2Ury3QPV1BXS3N1xWcj9bTHeU8QbLy9vyq9Btbc_-5BlvwQe3fLxPFwZz8S1j2nuQxD",
  },
]

const partners = [
  { icon: "token", name: "Sequoia" },
  { icon: "all_inclusive", name: "Andreessen" },
  { icon: "landscape", name: "Benchmark" },
  { icon: "filter_drama", name: "Accel" },
  { icon: "bolt", name: "Lightspeed" },
]

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-32">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-8">
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                New: Portfolio Health Scoring
              </div>
              
              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight">
                Smarter, Faster <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Due Diligence</span> for Venture Capital
              </h1>
              
              <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-text-secondary mb-10 leading-relaxed">
                Leverage AI to aggregate data, analyze startups, and manage your portfolio with unparalleled precision. Make data-driven decisions in seconds, not weeks.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-600 hover:scale-105"
                >
                  Get Started Free
                </Link>
                <button className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-8 text-base font-semibold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <span className="material-symbols-outlined text-[20px] mr-2">play_circle</span>
                  Watch Demo
                </button>
              </div>
            </div>
            
            {/* Hero Image / Dashboard Preview */}
            <div className="mt-16 sm:mt-24 relative">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-2 shadow-2xl backdrop-blur-sm lg:rounded-2xl lg:p-3">
                <div className="aspect-[16/9] w-full rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden relative group">
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuDnZavltEXqVm6rIbL3C-q2C7c9taHQEgA4xEkXLbUyR_5r-AtEZZiSAUSlY7H6z_5iNOZDjVy0W2yWenSbSlpfJARGkOfT_iz5zY4WDHNXsNXG2NHmp_iyv73EkXYAJ-6T3_u9jM8W3X8f5mgf00WERj4lRbbW1jnbhxfDvJh2n_aV6OZ7fNPbtdHveSybKGuSyY0AaM3nX3521eK7cePNeDAqqamgac9EZeKaBKBHSyaY10lCLI6L-me5eImU449MdVObxwZ-kqPL")` }}
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent opacity-60"></div>
                  <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                    <div className="bg-surface-dark/90 backdrop-blur border border-slate-700 p-4 rounded-lg shadow-xl max-w-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-sm">smart_toy</span>
                        </div>
                        <div className="text-sm font-semibold text-white">AI Analysis Complete</div>
                      </div>
                      <p className="text-xs text-text-secondary">Series A candidate shows 92% match with current thesis. Market indicators positive.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Partners / Trust Section */}
        <section className="py-12 border-y border-slate-200 dark:border-border-dark bg-slate-50/50 dark:bg-background-dark">
          <div className="container mx-auto px-4">
            <p className="text-center text-sm font-bold tracking-widest text-slate-500 dark:text-text-secondary uppercase mb-8">
              Trusted by Top Tier Firms
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
              {partners.map((partner) => (
                <div key={partner.name} className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-white">
                  <span className="material-symbols-outlined">{partner.icon}</span>
                  {partner.name}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Section */}
        <section className="py-24 bg-white dark:bg-background-dark relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-16 md:text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-4">
                The Future of Investment Decisions
              </h2>
              <p className="text-lg text-slate-600 dark:text-text-secondary">
                Our AI-driven platform transforms how you source, screen, and support your portfolio companies, giving you the edge in a competitive market.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group relative rounded-2xl border border-slate-200 dark:border-[#324867] bg-slate-50 dark:bg-surface-dark p-6 transition-all hover:shadow-lg hover:border-primary/50"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">{feature.icon}</span>
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-text-secondary">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-24 bg-slate-50 dark:bg-[#0d121a]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Built for Modern VCs
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.name}
                  className="flex flex-col justify-between rounded-2xl bg-white dark:bg-surface-dark p-8 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
                >
                  <div className="mb-6 text-primary">
                    <span className="material-symbols-outlined text-4xl">format_quote</span>
                  </div>
                  <blockquote className="text-lg font-medium text-slate-900 dark:text-white mb-6">
                    &quot;{testimonial.quote}&quot;
                  </blockquote>
                  <div className="flex items-center gap-4 mt-auto">
                    <div
                      className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover bg-center"
                      style={{ backgroundImage: `url("${testimonial.image}")` }}
                    ></div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{testimonial.name}</div>
                      <div className="text-sm text-slate-500 dark:text-text-secondary">{testimonial.title}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 relative overflow-hidden bg-background-dark">
          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center opacity-30 mix-blend-overlay"
            style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuCJOJ4f1b61q4wW8UyQwK42W0eB0aZw7_lG0bE0DN1Pm3067MGTUvFLv-O3U4H0FwTluv8x66Bez2kf2_IcmiKqxam563P5oKsglgoMXOws72lBWAp-Q7YysHonjs61YlHMghapkntNQoNN6y-Et2RzOHPVEJi-z37GPYUW2eav_MY0oT9Z6yTUlf04kTbYz_13T2Z2LHQxzV56Gg44bnRMQSlYdhWkOQOFwPgXUxHHsIxA2KlGWkIzgHUprn6s6R3GO4gXP9wC_c_Q")` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/80 to-transparent"></div>
          
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl mb-6">
              Ready to upgrade your investment stack?
            </h2>
            <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
              Join hundreds of forward-thinking VCs who are making smarter decisions faster.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-lg bg-primary px-8 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-600 hover:scale-105"
              >
                Get Started Free
              </Link>
              <button className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-lg border border-slate-600 bg-transparent px-8 text-base font-bold text-white transition-all hover:bg-slate-800">
                Book a Demo
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-border-dark bg-white dark:bg-[#0f151e] py-12 text-slate-600 dark:text-text-secondary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-white">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-white">
                  <span className="material-symbols-outlined text-sm">analytics</span>
                </div>
                <span className="text-lg font-bold">VC Copilot</span>
              </div>
              <p className="text-sm mb-6">The operating system for modern venture capital firms.</p>
              <div className="flex gap-4">
                <a className="text-slate-400 hover:text-primary transition-colors" href="#">
                  <span className="material-symbols-outlined">public</span>
                </a>
                <a className="text-slate-400 hover:text-primary transition-colors" href="#">
                  <span className="material-symbols-outlined">alternate_email</span>
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Product</h4>
              <ul className="flex flex-col gap-3 text-sm">
                <li><Link className="hover:text-primary transition-colors" href="/chat">Features</Link></li>
                <li><Link className="hover:text-primary transition-colors" href="/integrations">Integrations</Link></li>
                <li><a className="hover:text-primary transition-colors" href="#">Security</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Company</h4>
              <ul className="flex flex-col gap-3 text-sm">
                <li><Link className="hover:text-primary transition-colors" href="/about">About Us</Link></li>
                <li><a className="hover:text-primary transition-colors" href="#">Careers</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">Blog</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Resources</h4>
              <ul className="flex flex-col gap-3 text-sm">
                <li><a className="hover:text-primary transition-colors" href="#">Documentation</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">Help Center</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">Community</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">Legal</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-200 dark:border-border-dark pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p>© 2024 VC Copilot Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
              <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
