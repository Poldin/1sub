import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-transparent border-t border-[#374151] mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h3 className="text-2xl font-bold text-[#3ecf8e] mb-2 hover:text-[#2dd4bf] transition-colors cursor-pointer">
              1sub<span className="text-[#9ca3af] font-normal">.io</span>
            </h3>
          </Link>
          <p className="text-[#9ca3af] mb-4">
            1 subscription, countless tools.
          </p>
          <div className="flex justify-center gap-6 text-sm flex-wrap">
            <Link
              href="/support"
              className="text-[#9ca3af] hover:text-[#3ecf8e] transition-colors"
            >
              Support
            </Link>
            <Link
              href="/privacy"
              className="text-[#9ca3af] hover:text-[#3ecf8e] transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-[#9ca3af] hover:text-[#3ecf8e] transition-colors"
            >
              Terms and Conditions
            </Link>
            <a
              href="https://discord.gg/R87YSYpKK"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#9ca3af] hover:text-[#3ecf8e] transition-colors"
            >
              Discord
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

