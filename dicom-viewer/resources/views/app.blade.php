<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'DICOM Viewer') }}</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    
    <!-- Auto-unregister any stale service worker from other projects -->
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for (let registration of registrations) {
                    registration.unregister();
                }
            });
        }
    </script>

    <!-- Google Fonts: Plus Jakarta Sans (Enterprise Medical UI) & JetBrains Mono (DICOM & MRN) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

    <!-- Scripts and Styles via Laravel Vite -->
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/main.jsx'])
</head>
<body class="bg-[#0b0f19] text-slate-100 font-sans selection:bg-sky-500/30 antialiased overflow-x-hidden">
    <div id="root"></div>
</body>
</html>
