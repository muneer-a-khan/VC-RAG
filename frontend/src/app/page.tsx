import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"

function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z" fill="currentColor" />
    </svg>
  )
}

function DatabaseIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
    </svg>
  )
}

function BrainIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.25 6.5 1.75 1.75 0 016.5 8.25zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.1 1.16 3.1 4.44z" />
    </svg>
  )
}

const partnerLogos = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBCdcax4ybIgTl5TTaVuBiJRjjwF76ZFBVNTZCtgHfUlkZiCRoNtGRt3hqa-JSAvUDBZ8Dafzh9GdWkdGkPRiva2jkT8rOZkW1BclHtuE8AH7kX4J9r5CItQ6HnrlmmqP4ZDogI-iYbrWj6PrJGKiwSaDNpS7CBn3KDTdc0ujlFFOD8DA7oVaqUs56TYkT59J8CqKdRd53OmQd1tEKIXVYy2kEsAs3bJM9GFgTg9u8SBZUSne6bMVdSrFLpLtZKY-TgN0pAGp1-uIAH",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuABPp-mrWmf7yhh6ZaLRRFDZp8hark6TGt-ftFbDuL2KOSeIGxVU55OH4Rxdt_d2DPYMMbOv8CkGJmAG5CEIfmmGw6_D_fOSXRL3iv7TznWHn6QJPG8VL8BTK4VvqoP_VMvtMxFYfA9y4cfchDGUqnGQC8dbE7ATASItG6vNmeAgaI5O-60cKX1IgYwazHUSMfj2LVl9Yj4a5ilLJj7f49onYH4egW-ccsu1kHB_Zr5kGEJQE5hmx4eVBIy975PCQDMIg8pig9gRwAX",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBGc5TriMl_V_4Fl2T2P7AgasXdLACdUQfreuYkX6kibnm_4MxfIEQVKDI7pwNd9qtowGesjsN21sTjTSjidUVkLZoR1Zm-5T8rCbOiNQ4eRggSIi0e6kLEUEPCKOl6hjKMjGTiFwIUh2l9nMug0MEqOzZ00GIIyNMSjVmQrCE6HSZlhMWNictVEw_T8kRehI4FPZBWaN7Hs4PIcOxkVmxEUvgCox1TNOij9ZDRQr-ZJeFecMcSD6ghUg6mORSh71T60XVYvkVP-3W8",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDsuHpa7QDkgcDeIrsRLF2WSUFGb7sSi91ZdQkBXERbbsP5m2KYNvygKKeaP9LAF9y-ybD0GRUBLF2b1V8JHjKkCpigshCC7d3VPnAPPcDbqnZWesGZMnKqdxKEtysKS2KjxdOnEZTyknFh9h7dQZpMOaPrxA4q-VZB1A1Bi1s2CVe6JGwKys8MLT3MrBoUV2PzOuGWUXYFNrAFchvxmkx1FbeqxhUboU-Zs0Yp7Qxpq5lC9HpRwz0nrpos_N9LM4KDn40782uM5pwu",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBD7dW72vbhqyyxymAlnd0Y2r5jlcKXtok6tQg5wzUm_8GmXuP-y8GyyDuMHHIQn1HF91FulG3MmG7M_e3Aw1xX6DNv4XhBy0ElJw8E_CMCEqm9x6lCcAzLLr-KoHVQ1yJNOj8VFlFeId6UPMyjyrkKxP75diLkV1P-Fqu-3x-uxbqafa7rpblmZB7fKbRc_jf4qRjy4qF0JR-l44_AuGBpJce3RfyOMJv6rNGzMzFn0Hr_iWNcQbBBoNkKB-eKDZXPWMqj8qBiCk7M",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDRwAa33UVsBjXP4_ZUUDtWEvIXyUKKGfaYQRS0ybNJRHifa50TMEauk9v1_e8zJvTIrZNtUtRqhqQC--RuLhYxbxBB2jzeeDoQGmfcGoaDodGtQpALiJOfqGKFzxpcOEYGoZExHfHC12Wx-dnJvxThl_64cZoUvbeHTkLQQr_bv1JRsdBYRVna8dR71QCl6CchB_Lk6qLGxyqQ2_auPLnFlNRS8H9wIKHJ2hcm5fEWeL8zIFbNsL4FSKgz0-tw1fVvCYKH7BqaPHfu",
]

const features = [
  {
    icon: DatabaseIcon,
    title: "Unified Data Aggregation",
    description: "Automatically pull and consolidate data from thousands of sources into one clean, unified view.",
  },
  {
    icon: BrainIcon,
    title: "AI-Powered Due Diligence",
    description: "Leverage proprietary AI models to analyze financials, market trends, and team backgrounds in minutes, not weeks.",
  },
  {
    icon: ChatIcon,
    title: "Natural Language Querying",
    description: "Ask complex questions in plain English and get instant, actionable answers from your aggregated data.",
  },
  {
    icon: ChartIcon,
    title: "Intelligent Portfolio Management",
    description: "Track company performance, monitor KPIs, and get proactive alerts on your portfolio companies.",
  },
]

const testimonials = [
  {
    quote: "VC Copilot has completely transformed our due diligence process. What used to take weeks of manual data gathering now takes minutes. It's a game-changer for our firm.",
    name: "Sarah Chen",
    title: "Partner, Apex Ventures",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD1zhvIsE_K-uNz4t76J__hXrVvFdr0bQKFXDmbcjdt1OJWJhpi-Oe-4rB-ps9ecECM2GzGOJSY63nysI6-H8PBOxuC1G6g6dTlBk33ulCd_cGTaIgaBNoc7GIH8x6uxYhX8Gti1cHSMHPBpSX3aUNx6Oe1zUnlGM8-7Kvfh0Fsi48fRJJMmr87rIMjfqdRlg1CpxGNYfbqdFJ3YxNtdgmq40QW2ljFJdJ673eq9bDa2yNgQRzYMHGUnRUrmKVQPY-oDaZqldMnWbwC",
  },
  {
    quote: "The ability to query our entire data lake with natural language is incredible. We're uncovering insights we would have missed otherwise. The ROI was immediate.",
    name: "Michael Lee",
    title: "Principal, Catalyst Capital",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC9-lub_Mt63JWQUleiWkW1W2VGHLwfwy5PZlI1gmLecRipTvS-aKYOPzc9X2jYSotctgBdFbWnbVrJtdLTDO31S_z3stLpzenQwg0zHJ5Sr2IGI6y50K0WxNKVruwPR9oOZiyJFLRUk0XVslvqjZubbFBzC1TYwOuPEdSP73VXTwGPRq79KFuspH45lv4dZL6U5NFwxkavuJ6N5RwcghnjXihNNsjqMm7dTZeaYM92fIjsIfmCkmrukkuhjB7oOdNc4XKemjvPHMx4",
  },
  {
    quote: "The portfolio management tools give us a real-time pulse on our investments. The proactive alerts have saved us from potential issues more than once.",
    name: "Jessica Rodriguez",
    title: "Analyst, Horizon Growth",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDdfeXM69i_LyF55wQWM8AIJZltAR-p6kSBZ6Q0gL2Hd5uk3NE6B1xO3iFWGNzNMung1vVAWYu2rAMtWYrPZtr8kkmmNgqTNIGdg-m607scIfHT5_z2IHrsyrHnbifa1ExcyigFe-zveSmU9DAImebcoKn9DGKEa7WGM6AfLHcFn67Sgsu-TqdvaZMpnC9z0-6lCpTsdenO7K2kM7qxqaUKKomXn3pYH1__2X_JXerek71qnkH1tu5q398WylQZQyvhmt0xYu59zOWK",
  },
]

export default function Home() {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-background-dark">
      <Navbar />

      <main className="flex flex-col items-center w-full">
        <div className="w-full max-w-7xl px-4 md:px-8">
          {/* Hero Section */}
          <section className="py-20 md:py-32">
            <div className="flex flex-col-reverse gap-10 lg:flex-row lg:items-center">
              <div className="flex w-full flex-col gap-6 text-center lg:text-left lg:w-1/2 sm:gap-8 opacity-0-initial animate-fade-in">
                <div className="flex flex-col gap-4">
                  <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em] sm:text-5xl">
                    Smarter, Faster Due Diligence for Venture Capital
                  </h1>
                  <h2 className="text-gray-400 text-base font-normal leading-normal sm:text-lg">
                    Harness the power of AI to aggregate data, uncover critical insights, and manage your portfolio with unparalleled efficiency. Transform your investment workflow today.
                  </h2>
                </div>
                <Link
                  href="/register"
                  className="flex self-center lg:self-start min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:opacity-90 transition-opacity"
                >
                  <span className="truncate">Get Started Free</span>
                </Link>
              </div>
              <div 
                className="w-full lg:w-1/2 aspect-square bg-center bg-no-repeat bg-cover rounded-xl opacity-0-initial animate-fade-in animate-delay-200"
                style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuAhxMWUg0FV1-K4VOART5VvsPWhNQnB0rMier0QL1Q5TmynO_KYkDxG7I8PnOVRZ7JSZBCpC8k1nsKIZDTw7gxbXc7BTNyE1IqhbGQQpA_4sSBQZ_ZvmF_sZfEXhkY3blivVjVF6FMHSe6QWHa9e2uHfQ4mY7G5v3yjpRw22CKUDe8F-kjB6lu5UyQkgbd-vo_cVJCNIhaUqKBjQxVilTgA_LCtQ6GLEBOQyCsgKF3uOoAFLv4S6J9Y230I9jGxIAJnVn9XY1xJiEqh")` }}
              />
            </div>
          </section>

          {/* Trust Bar */}
          <section className="py-12 opacity-0-initial animate-fade-in animate-delay-300">
            <p className="text-gray-400 text-sm font-normal leading-normal pb-6 pt-1 px-4 text-center uppercase tracking-wider">
              TRUSTED BY LEADING VENTURE CAPITAL FIRMS
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8 items-center px-4">
              {partnerLogos.map((logo, index) => (
                <img
                  key={index}
                  alt={`Partner Logo ${index + 1}`}
                  className="h-8 w-auto mx-auto grayscale opacity-60 invert"
                  src={logo}
                />
              ))}
            </div>
          </section>

          {/* Feature Section */}
          <section className="py-20 md:py-32">
            <div className="flex flex-col gap-12">
              <div className="flex flex-col gap-6 items-center text-center opacity-0-initial animate-fade-in animate-delay-100">
                <div className="flex flex-col gap-4 max-w-3xl">
                  <h1 className="text-white tracking-tight text-3xl font-bold leading-tight sm:text-4xl sm:font-black sm:tracking-[-0.033em]">
                    A Platform Built for Modern VCs
                  </h1>
                  <p className="text-gray-400 text-base font-normal leading-normal sm:text-lg">
                    From initial screening to portfolio management, our AI-powered platform provides the tools you need to make data-driven decisions with confidence and speed.
                  </p>
                </div>
                <Link
                  href="/chat"
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary/10 text-primary text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/20 transition-colors"
                >
                  <span className="truncate">Explore the Platform</span>
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {features.map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <div
                      key={feature.title}
                      className={`flex flex-col gap-4 rounded-xl border border-white/10 p-6 bg-background-dark/50 opacity-0-initial animate-fade-in animate-delay-${(index + 2) * 100}`}
                      style={{ animationDelay: `${(index + 2) * 100}ms` }}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                        <Icon />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-white text-lg font-bold">{feature.title}</p>
                        <p className="text-gray-400 text-base font-normal leading-normal">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Testimonial Section */}
          <section className="py-20 md:py-32">
            <div className="flex flex-col gap-12 items-center">
              <div className="flex flex-col gap-4 max-w-3xl text-center opacity-0-initial animate-fade-in">
                <h2 className="text-white tracking-tight text-3xl font-bold leading-tight sm:text-4xl sm:font-black sm:tracking-[-0.033em]">
                  Why VCs Love VC Copilot
                </h2>
                <p className="text-gray-400 text-base font-normal leading-normal sm:text-lg">
                  Don't just take our word for it. Here's what industry leaders are saying about our platform.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                {testimonials.map((testimonial, index) => (
                  <div
                    key={testimonial.name}
                    className="flex flex-col gap-6 p-8 bg-background-dark/50 border border-white/10 rounded-xl opacity-0-initial animate-fade-in"
                    style={{ animationDelay: `${(index + 1) * 150}ms` }}
                  >
                    <p className="text-gray-300">"{testimonial.quote}"</p>
                    <div className="flex items-center gap-4">
                      <img
                        className="h-12 w-12 rounded-full object-cover"
                        src={testimonial.image}
                        alt={testimonial.name}
                      />
                      <div>
                        <p className="font-bold text-white">{testimonial.name}</p>
                        <p className="text-sm text-gray-400">{testimonial.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA Section */}
          <section className="py-20 md:py-32">
            <div className="bg-background-dark/50 border border-white/10 rounded-xl px-6 py-16 text-center opacity-0-initial animate-fade-in">
              <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
                <h2 className="text-white tracking-tight text-3xl font-bold leading-tight sm:text-4xl sm:font-black sm:tracking-[-0.033em]">
                  Ready to Transform Your Workflow?
                </h2>
                <p className="text-gray-400 text-base font-normal leading-normal sm:text-lg">
                  Join the leading VCs who are leveraging AI to gain a competitive edge. Schedule a personalized demo to see how VC Copilot can help you make smarter, faster investment decisions.
                </p>
                <Link
                  href="/register"
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:opacity-90 transition-opacity"
                >
                  <span className="truncate">Get Started Free</span>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full flex justify-center border-t border-white/10 bg-background-dark/50">
        <div className="w-full max-w-7xl px-4 md:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="flex flex-col gap-4 items-start col-span-1 md:col-span-2">
              <div className="flex items-center gap-4">
                <Logo className="size-6 text-primary" />
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">VC Copilot</h2>
              </div>
              <p className="text-gray-400 max-w-sm">
                The leading AI-powered due diligence and portfolio management platform for venture capitalists.
              </p>
            </div>
            <div className="col-span-1">
              <h3 className="font-bold text-white mb-4">Product</h3>
              <div className="flex flex-col gap-3">
                <Link href="/chat" className="text-gray-400 hover:text-primary transition-colors">Chat</Link>
                <Link href="/projects" className="text-gray-400 hover:text-primary transition-colors">Projects</Link>
                <Link href="/integrations" className="text-gray-400 hover:text-primary transition-colors">Integrations</Link>
                <Link href="/register" className="text-gray-400 hover:text-primary transition-colors">Get Started</Link>
              </div>
            </div>
            <div className="col-span-1">
              <h3 className="font-bold text-white mb-4">Company</h3>
              <div className="flex flex-col gap-3">
                <Link href="/about" className="text-gray-400 hover:text-primary transition-colors">About Us</Link>
                <Link href="#" className="text-gray-400 hover:text-primary transition-colors">Careers</Link>
                <Link href="#" className="text-gray-400 hover:text-primary transition-colors">Contact</Link>
                <Link href="#" className="text-gray-400 hover:text-primary transition-colors">Legal</Link>
              </div>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">© 2024 VC Copilot. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-primary transition-colors">
                <XIcon />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary transition-colors">
                <LinkedInIcon />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
