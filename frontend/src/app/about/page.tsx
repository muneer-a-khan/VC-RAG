import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"

const values = [
  {
    icon: "bolt",
    title: "Speed",
    description: "Accelerate deal flow screening by 10x with automated analysis pipelines that never sleep.",
  },
  {
    icon: "track_changes",
    title: "Accuracy",
    description: "Data-driven insights that reduce risk, highlight outliers, and validate founder claims instantly.",
  },
  {
    icon: "verified_user",
    title: "Security",
    description: "Enterprise-grade encryption and strict access controls for your proprietary investment data.",
  },
]

export default function AboutPage() {
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-x-hidden">
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
        <Navbar />
        
        {/* Main Content Wrapper */}
        <div className="layout-container flex h-full grow flex-col">
          <div className="flex flex-1 justify-center py-5">
            <div className="layout-content-container flex flex-col max-w-[960px] flex-1 px-4">
              
              {/* Hero Section */}
              <div className="mb-8">
                <div className="p-4">
                  <div
                    className="flex min-h-[480px] flex-col gap-6 bg-cover bg-center bg-no-repeat rounded-lg items-center justify-center p-4 relative overflow-hidden group"
                    style={{
                      backgroundImage: `linear-gradient(rgba(16, 24, 34, 0.7) 0%, rgba(16, 24, 34, 0.9) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuB2FDKD1OaL933P2bQiK4zEULWCD5kE8nDeKu7YV2vQCMQ3ZXFTNwcCx7Ws8ugQ6eYw8_8qCO9ASj5ubdAu06z3jUcOycahhpDVLy_pl5MQqOJwv7ShxoLOrJBwaj-B8KsGfxMhtOITOdANIBJFxz4TsBqaxws9XbEcHcvq_4k3SeB9Vdzoa6795u6ebQeDJwTT3ylejv_0JM_rp7rhPf3qzRbPUOCCeozfzoPtyo6qiS5crHbZNlB1aVLeG53rSZGBFmRYrgWAJmQF")`,
                    }}
                  >
                    <div className="flex flex-col gap-2 text-center z-10 max-w-[800px]">
                      <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em] sm:text-5xl">
                        About VC Copilot
                      </h1>
                      <h2 className="text-slate-300 text-base font-normal leading-normal sm:text-lg mt-2">
                        Empowering the next generation of venture capital with artificial intelligence.
                      </h2>
                    </div>
                    <Link
                      href="/register"
                      className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] z-10 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                    >
                      View Our Mission
                    </Link>
                  </div>
                </div>
              </div>

              {/* Mission & Values Section */}
              <div className="flex flex-col gap-10 px-4 py-10">
                <div className="flex flex-col gap-4">
                  <h1 className="text-slate-900 dark:text-white tracking-tight text-[32px] font-bold leading-tight sm:text-4xl sm:font-black max-w-[720px]">
                    Our Mission
                  </h1>
                  <p className="text-slate-600 dark:text-text-secondary text-base font-normal leading-normal max-w-[720px] text-lg">
                    We are on a mission to remove bias from investing, speed up due diligence, and use data to uncover the next unicorn. 
                    By combining proprietary algorithms with human intuition, we help VCs make smarter decisions faster.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-0 mt-6">
                  {values.map((value) => (
                    <div
                      key={value.title}
                      className="flex flex-1 gap-4 rounded-xl border border-slate-200 dark:border-[#324867] bg-white dark:bg-surface-dark p-6 flex-col shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="text-primary p-3 bg-primary/10 rounded-lg w-fit">
                        <span className="material-symbols-outlined text-[32px]">{value.icon}</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight">{value.title}</h2>
                        <p className="text-slate-600 dark:text-text-secondary text-sm font-normal leading-normal">{value.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Section */}
              <div className="my-8">
                <div className="flex flex-col justify-end gap-6 px-4 py-10 sm:gap-8 sm:px-10 sm:py-20 bg-gradient-to-br from-surface-dark to-background-dark rounded-xl border border-[#324867] mx-4 md:mx-0">
                  <div className="flex flex-col gap-2 text-center items-center">
                    <h1 className="text-white tracking-tight text-[32px] font-bold leading-tight sm:text-4xl sm:font-black max-w-[720px]">
                      Ready to modernize your investment strategy?
                    </h1>
                    <p className="text-text-secondary text-base font-normal leading-normal max-w-[600px] mt-2">
                      Join the leading firms using VC Copilot to find the next unicorn before anyone else.
                    </p>
                  </div>
                  <div className="flex flex-1 justify-center mt-4">
                    <Link
                      href="/register"
                      className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-8 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/25"
                    >
                      Get Started Free
                    </Link>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <footer className="flex flex-col gap-6 px-5 py-10 text-center border-t border-slate-200 dark:border-border-dark mt-10">
                <div className="flex justify-center mb-4">
                  <div className="size-8 text-text-secondary">
                    <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                      <path clipRule="evenodd" d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z" fill="currentColor" fillRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-6 text-slate-600 dark:text-text-secondary">
                  <a className="text-sm font-normal leading-normal hover:text-primary transition-colors" href="#">Privacy Policy</a>
                  <a className="text-sm font-normal leading-normal hover:text-primary transition-colors" href="#">Terms of Service</a>
                  <a className="text-sm font-normal leading-normal hover:text-primary transition-colors" href="#">Contact Support</a>
                </div>
                <p className="text-slate-500 dark:text-[#526071] text-sm font-normal leading-normal">© 2024 VC Copilot. All rights reserved.</p>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
