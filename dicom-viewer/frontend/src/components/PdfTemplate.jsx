import React from 'react';

export const PdfTemplate = React.forwardRef(({ 
  report, 
  dicomFile, 
  patient, 
  doctor, 
  appLogo, 
  capturedImage 
}, ref) => {
  // Format Date safely
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    month: 'numeric', day: 'numeric', year: '2-digit'
  }) + ', ' + new Date().toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true
  });

  return (
    <div style={{ display: 'none' }}>
      <div 
        ref={ref} 
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '15mm 20mm',
          backgroundColor: 'white',
          color: 'black',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '10pt',
          lineHeight: '1.4',
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        {/* TOP METADATA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', marginBottom: '20px', color: '#000' }}>
          <div>{todayStr}</div>
          <div>Print</div>
        </div>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
          <div style={{ width: '120px' }}>
            {appLogo ? (
              <img src={appLogo} alt="Logo" style={{ width: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0077ff' }}>HOSPITAL LOGO</div>
            )}
          </div>
          <div style={{ textAlign: 'right', fontSize: '9pt', borderLeft: '1px solid #000', paddingLeft: '15px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '9.5pt' }}>Jl. Raya Timur III Dawuan No. 875 Kab. Majalengka Kab.</div>
            <div style={{ fontWeight: 'bold', fontSize: '9.5pt' }}>Majalengka</div>
            <div style={{ fontWeight: 'bold', fontSize: '9.5pt' }}>Jawa Barat - Indonesia</div>
            <div style={{ fontWeight: 'bold', fontSize: '9.5pt' }}>Telp : 081211151300</div>
            <div style={{ fontWeight: 'bold', fontSize: '9.5pt' }}>Fax : </div>
            <div style={{ fontWeight: 'bold', fontSize: '9.5pt' }}>Email : rsialivasya114@gmail.com</div>
            <div style={{ fontWeight: 'bold', fontSize: '9.5pt' }}>https://livasya.id/</div>
          </div>
        </div>

        <h1 style={{ 
          fontSize: '22pt', 
          fontWeight: '300', 
          color: '#333', 
          borderBottom: '1px solid #ccc',
          paddingBottom: '5px', 
          marginBottom: '2px',
          fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        }}>
          UNIT RADIOLOGI
        </h1>
        <div style={{ borderBottom: '2px solid #ccc', marginBottom: '25px' }}></div>

        {/* PATIENT INFO GRID */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', fontSize: '10pt', color: '#333' }}>
          <div style={{ width: '48%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '130px', paddingBottom: '6px' }}>No RM</td>
                  <td style={{ paddingBottom: '6px' }}>: {patient?.medical_record_number || '-'}</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px' }}>No Radiologi</td>
                  <td style={{ paddingBottom: '6px' }}>: {dicomFile?.uuid?.substring(0, 8).toUpperCase() || '-'}</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px' }}>Nama Pasien</td>
                  <td style={{ textTransform: 'uppercase', paddingBottom: '6px' }}>
                    <div style={{ lineHeight: '1.2' }}>: {patient?.name || '-'}</div>
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px' }}>Tgl Lahir / Umur</td>
                  <td style={{ paddingBottom: '6px' }}>: {patient?.birth_date || '-'}</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px' }}>Jenis Kelamin</td>
                  <td style={{ paddingBottom: '6px' }}>: Laki-laki</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px' }}>Tgl Pemeriksaan</td>
                  <td style={{ paddingBottom: '6px' }}>: {formatDate(dicomFile?.created_at)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ width: '48%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '130px', paddingBottom: '6px' }}>No Registrasi</td>
                  <td style={{ paddingBottom: '6px' }}>: -</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px' }}>Dokter Pengirim</td>
                  <td style={{ paddingBottom: '6px' }}>: -</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px' }}>Ruangan Pengirim</td>
                  <td style={{ paddingBottom: '6px' }}>: -</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px' }}>Dokter Radiologi</td>
                  <td style={{ paddingBottom: '6px' }}>: {doctor?.name || '-'}</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px' }}>Diagnosa Klinis</td>
                  <td style={{ paddingBottom: '6px' }}>: -</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px', fontWeight: 'bold' }}>Jenis Pemeriksaan</td>
                  <td style={{ paddingBottom: '6px' }}>: DICOM STUDY</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ borderBottom: '1px solid #ccc', marginBottom: '20px' }}></div>

        {/* REPORT CONTENT */}
        <div style={{ marginBottom: '30px', minHeight: '150px', fontSize: '10.5pt', color: '#333' }}>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {report?.content || 'Belum ada hasil diagnosa.'}
          </div>
        </div>

        {/* CAPTURED IMAGE - PAGE 2 */}
        {capturedImage && (
          <div style={{ pageBreakBefore: 'always', paddingTop: '10mm' }}>
            {/* Header again for page 2 */}
            <h1 style={{ 
              fontSize: '18pt', 
              fontWeight: '300', 
              color: '#333', 
              borderBottom: '1px solid #ccc',
              paddingBottom: '5px', 
              marginBottom: '2px',
              fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif'
            }}>
              LAMPIRAN CITRA MEDIS
            </h1>
            <div style={{ borderBottom: '2px solid #ccc', marginBottom: '25px' }}></div>
            
            <div style={{ textAlign: 'center' }}>
              <img 
                src={capturedImage} 
                alt="DICOM Snapshot" 
                style={{ maxWidth: '100%', maxHeight: '220mm', objectFit: 'contain' }} 
              />
            </div>
          </div>
        )}

        {/* SIGNATURE */}
        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end', pageBreakInside: 'avoid' }}>
          <div style={{ textAlign: 'center', marginRight: '40px' }}>
            <div style={{ marginBottom: '5px', fontSize: '10pt', color: '#333' }}>Dokter Radiologi,</div>
            {doctor?.signature_url ? (
              <img src={doctor.signature_url} alt="Signature" style={{ height: '70px', objectFit: 'contain' }} />
            ) : (
              <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Fallback if no signature is uploaded */}
                <span style={{ fontStyle: 'italic', color: '#aaa', fontSize: '8pt' }}>No Signature</span>
              </div>
            )}
            <div style={{ fontSize: '10pt', color: '#000', marginTop: '5px' }}>{doctor?.name || 'Dr. Toripin Sp. Rad'}</div>
          </div>
        </div>

        {/* BOTTOM METADATA */}
        <div style={{ position: 'absolute', bottom: '15mm', left: '20mm', right: '20mm', display: 'flex', justifyContent: 'space-between', fontSize: '8pt', color: '#000' }}>
          <div>192.168.1.253/real/radiologi/print_hasil/28244</div>
          <div>1/1</div>
        </div>
        
      </div>
    </div>
  );
});

export default PdfTemplate;
