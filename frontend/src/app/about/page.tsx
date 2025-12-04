import { Navbar } from "@/components/layout/navbar"
import Link from "next/link"

function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z" fill="currentColor" />
    </svg>
  )
}

export default function AboutPage() {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-background-dark">
      <Navbar />

      <main className="flex flex-col items-center w-full flex-1">
        <div className="w-full max-w-7xl px-4 md:px-8 py-20">
          {/* Hero */}
          <section className="flex flex-col items-center text-center gap-8 mb-20">
            <Logo className="size-16 text-primary" />
            <h1 className="text-white text-4xl sm:text-5xl font-black leading-tight tracking-[-0.033em]">
              About VC Copilot
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl">
              We're building the future of venture capital intelligence. Our AI-powered platform helps VCs make smarter, faster investment decisions.
            </p>
          </section>

          {/* Mission */}
          <section className="mb-20">
            <div className="bg-background-dark/50 border border-white/10 rounded-xl p-8 md:p-12">
              <h2 className="text-white text-2xl sm:text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Venture capital has always been about finding the next big thing. But in today's fast-paced market, the sheer volume of data can be overwhelming. That's why we built VC Copilot.
              </p>
              <p className="text-gray-300 text-lg leading-relaxed">
                Our mission is to empower venture capitalists with AI-driven insights that cut through the noise. We aggregate data from thousands of sources, apply sophisticated machine learning models, and deliver actionable intelligence—all in a single, intuitive platform.
              </p>
            </div>
          </section>

          {/* Values */}
          <section className="mb-20">
            <h2 className="text-white text-2xl sm:text-3xl font-bold mb-8 text-center">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background-dark/50 border border-white/10 rounded-xl p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-white text-lg font-bold mb-2">Speed</h3>
                <p className="text-gray-400">
                  In VC, timing is everything. We help you move faster without sacrificing quality.
                </p>
              </div>
              <div className="bg-background-dark/50 border border-white/10 rounded-xl p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-white text-lg font-bold mb-2">Accuracy</h3>
                <p className="text-gray-400">
                  Our AI models are trained on millions of data points to deliver precise, reliable insights.
                </p>
              </div>
              <div className="bg-background-dark/50 border border-white/10 rounded-xl p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-white text-lg font-bold mb-2">Security</h3>
                <p className="text-gray-400">
                  Your data is your competitive edge. We protect it with enterprise-grade security.
                </p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center">
            <div className="bg-primary/10 border border-primary/20 rounded-xl px-6 py-12">
              <h2 className="text-white text-2xl sm:text-3xl font-bold mb-4">
                Ready to get started?
              </h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                Join the leading VCs who are already using VC Copilot to transform their investment workflow.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-lg h-12 px-6 bg-primary text-white font-bold hover:opacity-90 transition-opacity"
              >
                Get Started Free
              </Link>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full flex justify-center border-t border-white/10 bg-background-dark/50 mt-auto">
        <div className="w-full max-w-7xl px-4 md:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Logo className="size-5 text-primary" />
              <span className="text-white font-bold">VC Copilot</span>
            </div>
            <p className="text-sm text-gray-400">© 2024 VC Copilot. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

