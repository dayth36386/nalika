import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

const description = "นาฬิกาเต็มจอสำหรับเปิดไว้ระหว่างทำงาน"

// Absolute base for og:image URLs. Override with NEXT_PUBLIC_SITE_URL if you add a custom domain.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://workclock-psi.vercel.app")

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Work Clock",
  description,
  applicationName: "Work Clock",
  openGraph: {
    type: "website",
    siteName: "Work Clock",
    title: "Work Clock",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Work Clock",
    description,
  },
}

export const viewport: Viewport = {
  themeColor: "#05060d",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
