export const metadata = {
  title: 'ASLAN Group',
  description: 'موقع ASLAN Group الرسمى',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, padding: 0, fontFamily: 'sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
