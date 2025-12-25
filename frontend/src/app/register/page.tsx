"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    organization: "",
  })

  const [validations, setValidations] = useState({
    minLength: false,
    passwordsMatch: false,
  })

  const updatePassword = (password: string) => {
    setFormData({ ...formData, password })
    setValidations({
      ...validations,
      minLength: password.length >= 8,
      passwordsMatch: password === formData.confirmPassword && password.length > 0,
    })
  }

  const updateConfirmPassword = (confirmPassword: string) => {
    setFormData({ ...formData, confirmPassword })
    setValidations({
      ...validations,
      passwordsMatch: formData.password === confirmPassword && confirmPassword.length > 0,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
          organization: formData.organization || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || "Registration failed")
      }

      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        router.push("/login")
      } else {
        router.push("/chat")
        router.refresh()
      }
    } catch (error: any) {
      setError(error.message || "Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = (provider: string) => {
    setIsLoading(true)
    signIn(provider, { callbackUrl: "/chat" })
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-background-dark overflow-hidden">
      {/* Abstract Gradient Blobs for Depth */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Top Navigation Bar */}
      <header className="relative z-20 flex items-center justify-between border-b border-border-dark/50 bg-background-dark/80 backdrop-blur-md px-6 py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-4 text-white">
          <div className="text-primary">
            <span className="material-symbols-outlined text-3xl">token</span>
          </div>
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">VC Copilot</h2>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-sm text-text-secondary font-medium">Already have an account?</span>
          <Link
            href="/login"
            className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-border-dark hover:bg-[#2c3f56] transition-colors text-white text-sm font-bold leading-normal tracking-[0.015em]"
          >
            Log In
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 relative z-10">
        {/* Glassmorphism Card */}
        <div className="w-full max-w-[520px] flex flex-col bg-[#1e293b]/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Card Header */}
          <div className="p-8 pb-6 text-center">
            <h1 className="text-white text-3xl font-black leading-tight tracking-[-0.033em] mb-3">Join VC Copilot</h1>
            <p className="text-text-secondary text-base font-normal leading-normal">AI-powered intelligence for smarter deal flow.</p>
          </div>

          {/* Card Body */}
          <div className="px-8 pb-8 flex flex-col gap-5">
            {/* Google OAuth Button */}
            <button
              onClick={() => handleOAuthSignIn("google")}
              disabled={isLoading}
              className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-white text-slate-900 hover:bg-gray-100 transition-colors gap-3 text-sm font-bold leading-normal tracking-[0.015em] border border-transparent disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.52 12.2901C23.52 11.4401 23.4401 10.7201 23.3 10.0301H12V14.5001H18.62C18.4901 15.6801 17.6501 17.2901 16.0301 18.3901L15.9961 18.5369L19.5574 21.2954L19.8001 21.3201C22.0401 19.2501 23.5201 16.1201 23.52 12.2901Z" fill="#4285F4" />
                <path d="M12.0001 24C15.1201 24 17.8701 22.95 19.8001 21.32L16.0301 18.39C15.0601 19.06 13.7201 19.52 12.0001 19.52C8.90006 19.52 6.27006 17.47 5.33006 14.65L5.18844 14.6622L1.49219 17.5256L1.44006 17.66C3.41006 21.49 7.42006 24 12.0001 24Z" fill="#34A853" />
                <path d="M5.33004 14.65C5.08004 13.92 4.93004 13.14 4.93004 12.33C4.93004 11.52 5.08004 10.74 5.33004 10.01L5.32354 9.85408L1.57963 6.94922L1.44004 7.02C0.520039 8.87 0.0000390625 10.96 0.0000390625 12.33C0.0000390625 13.7 0.520039 15.79 1.44004 17.64L5.33004 14.65Z" fill="#FBBC05" />
                <path d="M12.0001 5.12C14.2201 5.12 15.6701 6.08 16.5201 6.89L19.8901 3.52C17.8701 1.63 15.1201 0.64 12.0001 0.64C7.42006 0.64 3.41006 3.15 1.44006 6.98L5.33006 10.01C6.27006 7.19 8.90006 5.12 12.0001 5.12Z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-[#324867]"></div>
              <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Or register with email</p>
              <div className="h-px flex-1 bg-[#324867]"></div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
                <span className="material-symbols-outlined text-red-400 text-sm mt-0.5">error</span>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white text-sm font-medium leading-normal" htmlFor="fullname">Full Name</label>
                <input
                  className="flex w-full rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-[#324867] bg-[#192433] focus:border-primary h-12 placeholder:text-[#586b84] px-4 text-base font-normal leading-normal transition-all"
                  id="fullname"
                  placeholder="Enter your full name"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white text-sm font-medium leading-normal" htmlFor="email">Work Email</label>
                <input
                  className="flex w-full rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-[#324867] bg-[#192433] focus:border-primary h-12 placeholder:text-[#586b84] px-4 text-base font-normal leading-normal transition-all"
                  id="email"
                  placeholder="name@company.com"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              {/* Organization (Optional) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline">
                  <label className="text-white text-sm font-medium leading-normal" htmlFor="organization">Organization</label>
                  <span className="text-[#586b84] text-xs">Optional</span>
                </div>
                <input
                  className="flex w-full rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-[#324867] bg-[#192433] focus:border-primary h-12 placeholder:text-[#586b84] px-4 text-base font-normal leading-normal transition-all"
                  id="organization"
                  placeholder="VC Firm or Company Name"
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              {/* Password Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Password */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-white text-sm font-medium leading-normal" htmlFor="password">Password</label>
                  <div className="relative">
                    <input
                      className="flex w-full rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-[#324867] bg-[#192433] focus:border-primary h-12 placeholder:text-[#586b84] pl-4 pr-10 text-base font-normal leading-normal transition-all"
                      id="password"
                      placeholder="Create password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) => updatePassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-white text-sm font-medium leading-normal" htmlFor="confirm-password">Confirm Password</label>
                  <input
                    className="flex w-full rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-[#324867] bg-[#192433] focus:border-primary h-12 placeholder:text-[#586b84] px-4 text-base font-normal leading-normal transition-all"
                    id="confirm-password"
                    placeholder="Repeat password"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => updateConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Validation Indicators */}
              <div className="flex flex-col gap-2 pt-1 pb-2">
                <div className={`flex items-center gap-2 text-xs ${validations.minLength ? "text-green-400" : "text-text-secondary"}`}>
                  <span className="material-symbols-outlined text-[16px]">
                    {validations.minLength ? "check_circle" : "circle"}
                  </span>
                  <span>Minimum 8 characters</span>
                </div>
                <div className={`flex items-center gap-2 text-xs ${validations.passwordsMatch ? "text-green-400" : "text-text-secondary"}`}>
                  <span className="material-symbols-outlined text-[16px]">
                    {validations.passwordsMatch ? "check_circle" : "circle"}
                  </span>
                  <span>Passwords match</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !validations.minLength || !validations.passwordsMatch}
                className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-primary hover:bg-primary/90 transition-all text-white text-base font-bold leading-normal tracking-[0.015em] shadow-[0_0_20px_rgba(19,109,236,0.4)] hover:shadow-[0_0_25px_rgba(19,109,236,0.6)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin mr-2">progress_activity</span>
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="flex flex-col items-center gap-4 text-center mt-2">
              <p className="text-[#586b84] text-xs leading-relaxed max-w-xs">
                By creating an account, you agree to our{" "}
                <a className="text-primary hover:text-primary/80 hover:underline" href="#">Terms of Service</a> and{" "}
                <a className="text-primary hover:text-primary/80 hover:underline" href="#">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
