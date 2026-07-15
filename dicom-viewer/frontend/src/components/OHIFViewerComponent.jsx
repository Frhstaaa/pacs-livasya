import React from 'react';

const OHIFViewerComponent = ({ uuid }) => {
  if (!uuid) return null;

  // URL encode the json API endpoint so OHIF can parse it safely
  const jsonUrl = encodeURIComponent(`/api/dicom/json/${uuid}`);
  const ohifUrl = `/ohif/viewer?url=${jsonUrl}`;

  return (
    <iframe 
      src={ohifUrl} 
      className="w-full h-full border-none"
      title="OHIF DICOM Viewer"
      allow="fullscreen"
    />
  );
};

export default OHIFViewerComponent;
