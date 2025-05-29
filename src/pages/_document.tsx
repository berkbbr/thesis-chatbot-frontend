import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#3b82f6" />
        
        {/* Apple PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="OrionBot" />
        
        {/* Apple Icons */}
        <link rel="apple-touch-icon" href="/orionbot-logo.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/orionbot-logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/orionbot-logo.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/orionbot-logo.png" />
        
        {/* Standard Icons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/orionbot-logo.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/orionbot-logo.png" />
        
        {/* Microsoft PWA */}
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-TileImage" content="/orionbot-logo.png" />
        
        {/* SEO Meta Tags */}
        <meta name="description" content="OrionBot - Your intelligent AI assistant for conversations and help" />
        <meta name="keywords" content="AI, chatbot, assistant, OrionBot, artificial intelligence" />
        <meta name="author" content="OrionBot" />
        
        {/* Open Graph */}
        <meta property="og:title" content="OrionBot - AI Assistant" />
        <meta property="og:description" content="Your intelligent AI assistant" />
        <meta property="og:image" content="/orionbot-logo.png" />
        <meta property="og:type" content="website" />
        
        {/* Viewport for mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}