<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://127.0.0.1:8000/api/dicom-router/browse");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
$output = curl_exec($ch);
$info = curl_getinfo($ch);
curl_close($ch);
echo "HTTP Code: " . $info['http_code'] . "\n";
echo "Response: " . $output . "\n";
