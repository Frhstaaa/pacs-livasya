import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export const PdfTemplate = React.forwardRef(({ 
  report, 
  dicomFile, 
  patient, 
  doctor, 
  appLogo, 
  appName = 'DICOM PACS',
  hospitalName = 'RSIA LIVASYA MAJALENGKA',
  capturedImage,
  relatedFiles
}, ref) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Generate QR Code if report is verified
  useEffect(() => {
    if (report?.verification_token) {
      const verifyUrl = `${window.location.origin}/api/report/verify-public/${report.verification_token}`;
      QRCode.toDataURL(verifyUrl, {
        width: 140,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).then(url => {
        setQrCodeUrl(url);
      }).catch(err => {
        console.error('QR generation error:', err);
      });
    } else {
      setQrCodeUrl('');
    }
  }, [report?.verification_token, report?.is_verified]);

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
          <div style={{ fontWeight: 'bold', color: report?.is_verified ? '#059669' : '#888' }}>
            {report?.is_verified ? 'SALINAN RESMI TERTANDA TANGAN ELEKTRONIK' : 'DRAFT / HASIL SEMENTARA'}
          </div>
        </div>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
          <div style={{ width: '130px' }}>
            {appLogo ? (
              <img src={appLogo} alt="Logo" style={{ width: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0077ff' }}>{(hospitalName || 'RSIA LIVASYA').toUpperCase()}</div>
            )}
          </div>
          <div style={{ textAlign: 'right', fontSize: '8.5pt', borderLeft: '2px solid #0077ff', paddingLeft: '15px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '9.5pt', color: '#0077ff' }}>{(hospitalName || 'RSIA LIVASYA MAJALENGKA').toUpperCase()}</div>
            <div style={{ color: '#444' }}>Jl. Raya Timur III Dawuan No. 875 Kab. Majalengka</div>
            <div style={{ color: '#444' }}>Jawa Barat - Indonesia | Telp : 081211151300</div>
            <div style={{ color: '#444' }}>Email : rsialivasya114@gmail.com | https://livasya.id/</div>
          </div>
        </div>

        <h1 style={{ 
          fontSize: '18pt', 
          fontWeight: '700', 
          color: '#1a1a1a', 
          borderBottom: '2px solid #0077ff',
          paddingBottom: '4px', 
          marginBottom: '2px',
          fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          letterSpacing: '0.5px'
        }}>
          HASIL PEMERIKSAAN RADIOLOGI
        </h1>
        <div style={{ borderBottom: '1px solid #ccc', marginBottom: '20px' }}></div>

        {/* PATIENT INFO GRID */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', fontSize: '9.5pt', color: '#222' }}>
          <div style={{ width: '48%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '130px', paddingBottom: '6px', color: '#666' }}>No RM</td>
                  <td style={{ paddingBottom: '6px', fontWeight: 'bold' }}>: {patient?.medical_record_number || '-'}</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px', color: '#666' }}>No Radiologi</td>
                  <td style={{ paddingBottom: '6px', fontFamily: 'monospace' }}>: {dicomFile?.uuid?.substring(0, 8).toUpperCase() || '-'}</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px', color: '#666' }}>Nama Pasien</td>
                  <td style={{ textTransform: 'uppercase', paddingBottom: '6px', fontWeight: 'bold' }}>
                    <div style={{ lineHeight: '1.2' }}>: {patient?.name || '-'}</div>
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px', color: '#666' }}>Tgl Lahir / Umur</td>
                  <td style={{ paddingBottom: '6px' }}>: {patient?.birth_date || '-'}</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px', color: '#666' }}>Jenis Kelamin</td>
                  <td style={{ paddingBottom: '6px' }}>: {patient?.gender || 'Laki-laki'}</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px', color: '#666' }}>Tgl Pemeriksaan</td>
                  <td style={{ paddingBottom: '6px' }}>: {formatDate(dicomFile?.created_at)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ width: '48%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '130px', paddingBottom: '6px', color: '#666' }}>No Registrasi</td>
                  <td style={{ paddingBottom: '6px' }}>: REG-{dicomFile?.uuid?.substring(0, 6).toUpperCase() || '-'}</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px', color: '#666' }}>Dokter Pengirim</td>
                  <td style={{ paddingBottom: '6px' }}>: {patient?.referring_physician || 'Dokter Poliklinik / IGD'}</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px', color: '#666' }}>Ruangan Pengirim</td>
                  <td style={{ paddingBottom: '6px' }}>: Rawat Inap / Jalan</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px', color: '#666' }}>Dokter Radiologi</td>
                  <td style={{ paddingBottom: '6px', fontWeight: 'bold', color: '#0077ff' }}>: {doctor?.name || 'Dr. Toripin Sp. Rad'}</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px', color: '#666' }}>Status Hasil</td>
                  <td style={{ paddingBottom: '6px' }}>
                    : {report?.is_verified ? (
                      <span style={{ color: '#059669', fontWeight: 'bold' }}>Terverifikasi Sah</span>
                    ) : (
                      <span style={{ color: '#d97706', fontWeight: 'bold' }}>Draft Belum Diverifikasi</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px', fontWeight: 'bold', color: '#666' }}>Pemeriksaan</td>
                  <td style={{ paddingBottom: '6px', fontWeight: 'bold' }}>
                    : {relatedFiles && relatedFiles.length > 0 
                        ? `${relatedFiles.map(f => f.file_name).join(', ')} (${relatedFiles.length} Studi)`
                        : (dicomFile?.file_name || 'STUDI RADIOLOGI')}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '6px', fontWeight: 'bold', color: '#666' }}>Diagnosa / Klinis</td>
                  <td style={{ paddingBottom: '6px', fontWeight: 'bold', color: '#111827' }}>
                    : {patient?.clinical_diagnosis || patient?.clinical_notes || '-'}
                    {patient?.icd10_code ? ` (ICD-10: ${patient.icd10_code})` : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ borderBottom: '1px solid #eee', marginBottom: '20px' }}></div>

        {/* REPORT CONTENT */}
        <div style={{ marginBottom: '30px', minHeight: '180px', fontSize: '10pt', color: '#222' }}>
          <div style={{ fontSize: '11pt', fontWeight: 'bold', marginBottom: '10px', color: '#0077ff', borderBottom: '1px solid #0077ff', paddingBottom: '3px', display: 'inline-block' }}>
            DESKRIPSI DAN KESIMPULAN RADIOLOGIS
          </div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontFamily: 'Arial, sans-serif' }}>
            {report?.content || 'Belum ada hasil diagnosa.'}
          </div>
        </div>

        {/* CAPTURED IMAGE - PAGE 2 */}
        {capturedImage && (
          <div style={{ pageBreakBefore: 'always', paddingTop: '10mm' }}>
            <h1 style={{ 
              fontSize: '16pt', 
              fontWeight: '700', 
              color: '#333', 
              borderBottom: '2px solid #0077ff',
              paddingBottom: '5px', 
              marginBottom: '2px',
              fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif'
            }}>
              LAMPIRAN CITRA MEDIS (KEY IMAGE)
            </h1>
            <div style={{ borderBottom: '1px solid #ccc', marginBottom: '20px' }}></div>
            
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <img 
                src={capturedImage} 
                alt="DICOM Snapshot" 
                style={{ maxWidth: '100%', maxHeight: '200mm', objectFit: 'contain', border: '1px solid #eee', borderRadius: '4px' }} 
              />
            </div>
            <div style={{ textAlign: 'center', fontSize: '8pt', color: '#666' }}>
              Tangkapan layar citra diagnostik terverifikasi oleh dokter radiologi penanggung jawab.
            </div>
          </div>
        )}

        {/* SIGNATURE & OFFICIAL DIGITAL VERIFICATION SEAL */}
        {report?.is_verified ? (
          <div style={{ 
            marginTop: '30px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-end', 
            pageBreakInside: 'avoid', 
            borderTop: '1px dashed #059669', 
            paddingTop: '15px' 
          }}>
            {/* Left: Official Legal Guarantee Note */}
            <div style={{ maxWidth: '58%', fontSize: '7.5pt', color: '#444' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#059669', borderRadius: '50%' }}></span>
                <span style={{ fontWeight: 'bold', color: '#065f46', fontSize: '8pt' }}>
                  TERVERIFIKASI & TERTANDA TANGANI ELEKTRONIK RESMI
                </span>
              </div>
              <div style={{ color: '#555', lineHeight: '1.4' }}>
                Dokumen hasil pemeriksaan ini sah dan telah diverifikasi secara digital oleh Dokter Spesialis Radiologi penanggung jawab sesuai ketentuan UU ITE No. 11/2008 & Standar Akreditasi Rumah Sakit (KARS).
              </div>
              <div style={{ marginTop: '5px', fontFamily: 'monospace', fontSize: '7.5pt', color: '#111', backgroundColor: '#f3f4f6', padding: '3px 6px', borderRadius: '4px', display: 'inline-block' }}>
                Token: <strong>{report.verification_token}</strong>
              </div>
              <div style={{ marginTop: '3px', fontSize: '7pt', color: '#666' }}>
                Waktu Verifikasi: {formatDate(report.verified_at)} WIB
              </div>
            </div>

            {/* Right: Doctor Box & Official QR Code */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              border: '1px solid #059669', 
              backgroundColor: '#f0fdf4', 
              padding: '8px 12px', 
              borderRadius: '6px' 
            }}>
              {qrCodeUrl && (
                <div style={{ textAlign: 'center' }}>
                  <img src={qrCodeUrl} alt="QR Validasi" style={{ width: '64px', height: '64px', display: 'block' }} />
                  <span style={{ fontSize: '6pt', color: '#065f46', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>SCAN VALIDASI</span>
                </div>
              )}
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '7pt', color: '#065f46', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Dokter Radiologi Penanggung Jawab
                </div>
                {doctor?.signature_url ? (
                  <img src={doctor.signature_url} alt="Signature" style={{ height: '36px', objectFit: 'contain', margin: '2px 0' }} />
                ) : (
                  <div style={{ height: '28px', display: 'flex', alignItems: 'center', color: '#059669', fontSize: '8pt', fontWeight: 'bold' }}>
                    [ Tanda Tangan Digital Sah ]
                  </div>
                )}
                <div style={{ fontSize: '9pt', fontWeight: 'bold', color: '#111' }}>
                  {doctor?.name || 'Dr. Toripin Sp. Rad'}
                </div>
                <div style={{ fontSize: '7pt', color: '#555' }}>
                  SIP/NIP: {doctor?.doctor_id || doctor?.id || '32.10.100.2.14'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Unverified draft fallback */
          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end', pageBreakInside: 'avoid' }}>
            <div style={{ textAlign: 'center', marginRight: '30px' }}>
              <div style={{ marginBottom: '5px', fontSize: '9.5pt', color: '#333' }}>Dokter Radiologi,</div>
              {doctor?.signature_url ? (
                <img src={doctor.signature_url} alt="Signature" style={{ height: '60px', objectFit: 'contain' }} />
              ) : (
                <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontStyle: 'italic', color: '#aaa', fontSize: '8pt' }}>Draft (Belum Diverifikasi)</span>
                </div>
              )}
              <div style={{ fontSize: '9.5pt', fontWeight: 'bold', color: '#000', marginTop: '5px' }}>
                {doctor?.name || 'Dr. Toripin Sp. Rad'}
              </div>
              <div style={{ fontSize: '7.5pt', color: '#666' }}>Dokter Spesialis Radiologi</div>
            </div>
          </div>
        )}

        {/* BOTTOM METADATA */}
        <div style={{ position: 'absolute', bottom: '12mm', left: '20mm', right: '20mm', display: 'flex', justifyContent: 'space-between', fontSize: '7pt', color: '#666', borderTop: '1px solid #ddd', paddingTop: '4px' }}>
          <div>
            {(hospitalName || 'RSIA LIVASYA').toUpperCase()} {(appName || 'PACS/RIS').toUpperCase()} &bull; {report?.is_verified ? `Verifikasi Digital: ${report.verification_token}` : 'DRAFT HASIL - Belum Diverifikasi'}
          </div>
          <div>Dokumen Sah {hospitalName || 'RSIA Livasya Majalengka'} &bull; Hal 1/1</div>
        </div>
        
      </div>
    </div>
  );
});

export default PdfTemplate;
