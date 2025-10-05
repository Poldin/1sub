export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Header */}
      <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#374151] z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-[#3ecf8e]">
                1sub<span className="text-[#9ca3af] font-normal">.io</span>
              </h1>
            </div>
            
            {/* CTA Button */}
            <a
              href="/login"
              className="btn-secondary text-sm sm:text-base"
            >
              join us
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="section-padding text-center">
        <div className="mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
            1 subscription,{" "}
            <span className="text-[#3ecf8e]">countless tools</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-[#d1d5db] max-w-3xl mx-auto mb-6 leading-relaxed">
            access a vast collection of tools with 1 single subscription. 
          </p>
          
          <a
            href="/login"
            id="join"
            className="btn-secondary text-sm sm:text-base px-2"
          >
            join us today!
          </a>
        </div>
      </section>

      {/* Tools Showcase */}
      <section className="section-padding bg-[#111111]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8">
            Featured Tools & Services
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Tool Card 1 */}
            <div className="bg-[#1f2937] rounded-lg p-4 hover:bg-[#374151] transition-colors">
              <div className="w-10 h-10 bg-[#3ecf8e] rounded-lg flex items-center justify-center mb-3">
                <span className="text-white font-bold text-xl">AI</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Writing Tools</h3>
              <p className="text-[#d1d5db] mb-4">
                Professional writing assistants, content generators, and editing tools 
                to enhance your creative workflow.
              </p>
              <div className="text-sm text-[#9ca3af]">
                Includes: GPT-4 access, Grammarly Premium, Jasper AI
              </div>
            </div>

            {/* Tool Card 2 */}
            <div className="bg-[#1f2937] rounded-lg p-4 hover:bg-[#374151] transition-colors">
              <div className="w-10 h-10 bg-[#10b981] rounded-lg flex items-center justify-center mb-3">
                <span className="text-white font-bold text-xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Analytics Suite</h3>
              <p className="text-[#d1d5db] mb-4">
                Comprehensive analytics and data visualization tools to track 
                performance and gain valuable insights.
              </p>
              <div className="text-sm text-[#9ca3af]">
                Includes: Google Analytics Pro, Mixpanel, Hotjar
              </div>
            </div>

            {/* Tool Card 3 */}
            <div className="bg-[#1f2937] rounded-lg p-4 hover:bg-[#374151] transition-colors">
              <div className="w-10 h-10 bg-[#f59e0b] rounded-lg flex items-center justify-center mb-3">
                <span className="text-white font-bold text-xl">🎨</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Design Tools</h3>
              <p className="text-[#d1d5db] mb-4">
                Professional design software and creative tools for stunning 
                visual content and user experiences.
              </p>
              <div className="text-sm text-[#9ca3af]">
                Includes: Adobe Creative Suite, Figma Pro, Canva Pro
              </div>
            </div>

            {/* Tool Card 4 */}
            <div className="bg-[#1f2937] rounded-lg p-4 hover:bg-[#374151] transition-colors">
              <div className="w-10 h-10 bg-[#8b5cf6] rounded-lg flex items-center justify-center mb-3">
                <span className="text-white font-bold text-xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Productivity Suite</h3>
              <p className="text-[#d1d5db] mb-4">
                Essential productivity tools to streamline your workflow 
                and boost team collaboration.
              </p>
              <div className="text-sm text-[#9ca3af]">
                Includes: Notion Pro, Slack Premium, Zapier
              </div>
            </div>

            {/* Tool Card 5 */}
            <div className="bg-[#1f2937] rounded-lg p-4 hover:bg-[#374151] transition-colors">
              <div className="w-10 h-10 bg-[#ef4444] rounded-lg flex items-center justify-center mb-3">
                <span className="text-white font-bold text-xl">🔧</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Developer Tools</h3>
              <p className="text-[#d1d5db] mb-4">
                Complete development environment with hosting, monitoring, 
                and deployment solutions.
              </p>
              <div className="text-sm text-[#9ca3af]">
                Includes: GitHub Pro, Vercel Pro, MongoDB Atlas
              </div>
            </div>

            {/* Tool Card 6 */}
            <div className="bg-[#1f2937] rounded-lg p-4 hover:bg-[#374151] transition-colors">
              <div className="w-10 h-10 bg-[#06b6d4] rounded-lg flex items-center justify-center mb-3">
                <span className="text-white font-bold text-xl">💼</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Business Tools</h3>
              <p className="text-[#d1d5db] mb-4">
                Professional business management tools for CRM, email marketing, 
                and financial planning.
              </p>
              <div className="text-sm text-[#9ca3af]">
                Includes: HubSpot, Mailchimp Pro, QuickBooks
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="section-padding">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            join our community
          </h2>
          <p className="text-lg text-[#d1d5db] mb-6 leading-relaxed">
            Connect with like-minded professionals, share experiences, and discover 
            new ways to optimize your toolkit. Our community helps you make the most 
            of every subscription.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/login"
              className="btn-secondary text-sm sm:text-base px-2"
            >
              join 1sub now!
            </a>
            <a
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#5865F2] text-white px-2 py-0.5 rounded-md text-sm sm:text-base hover:bg-[#4752C4] transition-colors border-2 border-white/20 hover:border-white/40"
            >
              join our Discord
            </a>
          </div>
        </div>
      </section>

      {/* Referral Program Section */}
      <section className="section-padding">
        <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-[#059669] to-[#047857] rounded-lg p-8 sm:p-12 text-center shadow-2xl border-2 border-white/60">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
              bring new members and earn            
            </h2>
            <div className="mb-6">
              <div className="text-8xl sm:text-9xl font-black text-white mb-2 leading-none">
                1%
              </div>
              <p className="text-xl sm:text-2xl text-green-50 font-semibold">
                lifetime commission
              </p>
            </div>
            <p className="text-base text-green-200 mb-4 max-w-2xl mx-auto opacity-80">
            Earn 1% for every new member you refer when they use tools with 1sub. Once entered, you get the commission until member leaves.
            </p>
            <p className="text-sm text-green-300 mb-8 max-w-2xl mx-auto opacity-70">
              Looking for deeper partnerships? Reach out to <span className="font-semibold text-white">partner@1sub.io</span>.
            </p>
            <a
              href="/login"
              className="inline-block bg-white text-[#059669] px-8 py-3 rounded-lg font-semibold text-lg hover:bg-green-50 transition-colors shadow-lg"
            >
              join us and share
            </a>
          </div>
        </div>
      </section>

      {/* Tool Provider Section */}
      <section className="section-padding bg-[#111111]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            want to feature your tool?
          </h2>
          <p className="text-lg text-[#d1d5db] mb-4 leading-relaxed">
            Join 1sub and get discovered by thousands of subscribers.
          </p>
          <p className="text-base text-[#3ecf8e] mb-8 font-semibold">
            Get a headstart, 1st month is free.
          </p>
          <div className="mb-4">
            <a
              href="/register"
              className="btn-secondary text-sm sm:text-base"
            >
              <span className="font-bold">sign up and submit</span>
            </a>
          </div>
          
          {/* Powered by Stripe */}
          <div className="flex items-center justify-center gap-1 mb-6 text-xs text-[#9ca3af]">
            <span>powered by</span>
            <span className="font-semibold text-[#6772E5]">Stripe</span>
          </div>
          
          <p className="text-sm text-[#9ca3af]">
            For partnerships and inquiries, write to 
            <a
              href="mailto:partner@1sub.io"
              className="text-[#3ecf8e] hover:text-[#2dd4aa] transition-colors ml-1 underline"
            >
              partner@1sub.io
            </a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111111] border-t border-[#374151]">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-[#3ecf8e] mb-2">
              1sub<span className="text-[#9ca3af] font-normal">.io</span>
            </h3>
            <p className="text-[#9ca3af] mb-4">
              1 subscription, countless tools.
            </p>
            <div className="flex justify-center gap-6 text-sm">
              <a
                href="/privacy"
                className="text-[#9ca3af] hover:text-[#3ecf8e] transition-colors"
              >
                Privacy
              </a>
              <a
                href="/terms"
                className="text-[#9ca3af] hover:text-[#3ecf8e] transition-colors"
              >
                Terms and Conditions
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
