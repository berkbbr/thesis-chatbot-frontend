import { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    // Device detection
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream
    const isAndroidDevice = /android/i.test(userAgent)
    
    setIsIOS(isIOSDevice)
    setIsAndroid(isAndroidDevice)

    // Service Worker'ı kaydet
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration)
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError)
          })
      })
    }

    // Install prompt'u yakala (Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
      setShowInstallBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // App'in yüklenip yüklenmediğini kontrol et
    const handleAppInstalled = () => {
      console.log('PWA was installed')
      setShowInstallBanner(false)
      setDeferredPrompt(null)
      setIsInstallable(false)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    // iOS için manuel kontrol (beforeinstallprompt iOS'ta çalışmaz)
    if (isIOSDevice) {
      const isInStandaloneMode = (window.navigator as any).standalone
      const hasBeenDismissed = localStorage.getItem('ios-pwa-dismissed')
      
      if (!isInStandaloneMode && !hasBeenDismissed) {
        setTimeout(() => {
          setShowInstallBanner(true)
        }, 3000) // 3 saniye bekle
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt && !isIOS) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      
      setDeferredPrompt(null)
      setShowInstallBanner(false)
    }
  }

  const handleDismiss = () => {
    setShowInstallBanner(false)
    
    if (isIOS) {
      localStorage.setItem('ios-pwa-dismissed', 'true')
    } else {
      localStorage.setItem('pwa-dismissed', Date.now().toString())
    }
  }

  // Eğer daha önce dismiss edilmişse gösterme kontrolü
  useEffect(() => {
    if (!isIOS) {
      const dismissed = localStorage.getItem('pwa-dismissed')
      if (dismissed) {
        const dismissedTime = parseInt(dismissed)
        const now = Date.now()
        const twentyFourHours = 24 * 60 * 60 * 1000
        
        if (now - dismissedTime < twentyFourHours) {
          setShowInstallBanner(false)
          return
        }
      }
    }
  }, [isIOS])

  // Eğer hiçbir install seçeneği yoksa gösterme
  if (!showInstallBanner || (!isInstallable && !isIOS)) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 shadow-lg border border-white/20 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isIOS ? <Smartphone className="w-5 h-5 text-white" /> : <Download className="w-5 h-5 text-white" />}
              <h3 className="text-white font-semibold text-sm">
                {isIOS ? 'Add to Home Screen' : 'Install OrionBot'}
              </h3>
            </div>
            
            {isIOS ? (
              <div className="text-white/90 text-xs mb-3">
                <p className="mb-2">Install this app on your iPhone:</p>
                <p>1. Tap the <strong>Share</strong> button below</p>
                <p>2. Select <strong>"Add to Home Screen"</strong></p>
              </div>
            ) : (
              <p className="text-white/90 text-xs mb-3">
                Add OrionBot to your home screen for quick access and a better experience!
              </p>
            )}
            
            <div className="flex gap-2">
              {!isIOS && (
                <button
                  onClick={handleInstallClick}
                  className="bg-white text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
                >
                  Install App
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-white/30 transition-colors"
              >
                {isIOS ? 'Maybe Later' : 'Not Now'}
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/70 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}