self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {}
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/map' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'くま！おる！熊！', options)
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow(event.notification.data.url)
    })
  )
})
