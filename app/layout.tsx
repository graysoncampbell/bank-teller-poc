import './globals.css'

export const metadata = {
  title: 'Unloan Q&A',
  description: 'Ask questions about home loans and get answers from Unloan content',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}