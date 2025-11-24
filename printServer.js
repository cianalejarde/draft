// printServer.js - Local Print Server for CliCare Hospital Kiosk
// Place this file in your backend folder

const puppeteer = require('puppeteer');
const printer = require('pdf-to-printer');
const fs = require('fs');
const path = require('path');

class PrintServer {
  constructor() {
    this.printQueue = [];
    this.isProcessing = false;
    this.browser = null;
  }

  // Initialize browser instance
  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      console.log('✅ Print server browser initialized');
    } catch (error) {
      console.error('❌ Failed to initialize print server:', error);
      throw error;
    }
  }

  // Get list of available printers
  async getAvailablePrinters() {
    try {
      const printers = await printer.getPrinters();
      return printers;
    } catch (error) {
      console.error('❌ Failed to get printers:', error);
      return [];
    }
  }

  // Generate PDF from HTML content
  async generatePDF(htmlContent, outputPath) {
    try {
      if (!this.browser) {
        await this.initialize();
      }

      const page = await this.browser.newPage();
      
      // Set content
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0'
      });

      // Generate PDF
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        }
      });

      await page.close();
      console.log('✅ PDF generated:', outputPath);
      return outputPath;
    } catch (error) {
      console.error('❌ PDF generation failed:', error);
      throw error;
    }
  }

  // Print PDF to specified printer
  async printPDF(pdfPath, printerName = null) {
    try {
      const options = printerName ? { printer: printerName } : {};
      
      await printer.print(pdfPath, options);
      console.log('✅ Printed successfully:', pdfPath);
      
      // Clean up PDF file after printing
      setTimeout(() => {
        fs.unlinkSync(pdfPath);
        console.log('🗑️ Cleaned up:', pdfPath);
      }, 5000);
      
      return true;
    } catch (error) {
      console.error('❌ Printing failed:', error);
      throw error;
    }
  }

  // Main method: Generate and print patient guidance packet
  async printPatientGuidance(registrationData, patientData, navigationSteps, floorPlanImage) {
    try {
      const htmlContent = this.generateGuidanceHTML(
        registrationData, 
        patientData, 
        navigationSteps, 
        floorPlanImage
      );

      // Create temporary PDF file
      const timestamp = Date.now();
      const pdfPath = path.join(__dirname, 'temp', `guidance_${timestamp}.pdf`);
      
      // Ensure temp directory exists
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Generate PDF
      await this.generatePDF(htmlContent, pdfPath);

      // Print PDF (uses default printer if none specified)
      await this.printPDF(pdfPath);

      return {
        success: true,
        message: 'Document printed successfully'
      };
    } catch (error) {
      console.error('❌ Print guidance failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate HTML content for guidance packet
  generateGuidanceHTML(registrationData, patientData, navigationSteps, floorPlanImage) {
    const issueDate = new Date();
    const formattedDate = issueDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedTime = issueDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>CliCare — Patient Guidance Packet</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            --clicare-green: #1a672a;
            --panel-width: 850px;
            --muted: #6b7280;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Inter, Arial, sans-serif;
            background: #f3f4f6;
            color: #111827;
            padding: 20px;
          }
          
          .panel {
            width: 100%;
            max-width: var(--panel-width);
            background: #ffffff;
            box-shadow: 0 8px 30px rgba(0,0,0,0.08);
            border-radius: 8px;
            border: 1px solid rgba(26,103,42,0.06);
            padding: 28px;
            margin: 0 auto;
          }
          
          .header {
            text-align: center;
            border-bottom: 2px solid var(--clicare-green);
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          
          .hospital-name {
            font-size: 28px;
            font-weight: 700;
            color: var(--clicare-green);
            margin-bottom: 4px;
          }
          
          .document-title {
            font-size: 16px;
            color: var(--muted);
            font-weight: 400;
          }
          
          .section {
            margin-bottom: 24px;
            padding: 16px;
            background: #f9fafb;
            border-radius: 6px;
            border-left: 4px solid var(--clicare-green);
          }
          
          .section-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--clicare-green);
            margin-bottom: 12px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          
          .info-item {
            display: flex;
            flex-direction: column;
          }
          
          .info-label {
            font-size: 12px;
            color: var(--muted);
            font-weight: 500;
            margin-bottom: 2px;
          }
          
          .info-value {
            font-size: 14px;
            color: #111827;
            font-weight: 600;
          }
          
          .queue-highlight {
            background: var(--clicare-green);
            color: white;
            padding: 16px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
          }
          
          .queue-number {
            font-size: 48px;
            font-weight: 700;
            margin: 8px 0;
          }
          
          .navigation-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          
          .navigation-table th {
            background: var(--clicare-green);
            color: white;
            padding: 10px;
            text-align: left;
            font-size: 13px;
            font-weight: 600;
          }
          
          .navigation-table td {
            padding: 10px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
          }
          
          .navigation-table tr:last-child td {
            border-bottom: none;
          }
          
          .floor-plan {
            margin-top: 16px;
            text-align: center;
          }
          
          .floor-plan img {
            max-width: 100%;
            height: auto;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
          }
          
          .emergency-note {
            background: #fef2f2;
            border: 1px solid #fca5a5;
            padding: 12px;
            border-radius: 6px;
            margin: 16px 0;
            font-size: 13px;
            color: #991b1b;
          }
          
          .footer-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: var(--muted);
          }
          
          @media print {
            body {
              background: white;
              padding: 0;
            }
            
            .panel {
              box-shadow: none;
              border: none;
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="panel">
          <!-- Header -->
          <div class="header">
            <div class="hospital-name">CLICARE HOSPITAL</div>
            <div class="document-title">Patient Guidance Packet</div>
          </div>

          <!-- Patient Information -->
          <div class="section">
            <div class="section-title">Patient Information</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Patient ID</span>
                <span class="info-value">${registrationData.patientId}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Name</span>
                <span class="info-value">${patientData.fullName || patientData.name}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Age / Sex</span>
                <span class="info-value">${patientData.age} / ${patientData.sex}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Contact</span>
                <span class="info-value">${patientData.contact_no || patientData.contactNo || 'N/A'}</span>
              </div>
            </div>
          </div>

          <!-- Queue Information -->
          <div class="queue-highlight">
            <div style="font-size: 16px; font-weight: 500;">Your Queue Number</div>
            <div class="queue-number">${registrationData.queue_number || 'N/A'}</div>
            <div style="font-size: 14px; opacity: 0.9;">Please proceed to: ${registrationData.recommendedDepartment}</div>
            <div style="font-size: 13px; margin-top: 8px; opacity: 0.8;">Estimated Wait: ${registrationData.estimated_wait || '15-30 minutes'}</div>
          </div>

          <!-- Symptoms -->
          <div class="section">
            <div class="section-title">Reported Symptoms</div>
            <div style="font-size: 14px; line-height: 1.6;">
              ${(patientData.selectedSymptoms || []).join(', ') || 'N/A'}
            </div>
          </div>

          <!-- Navigation Steps -->
          ${navigationSteps && navigationSteps.length > 0 ? `
          <div class="section">
            <div class="section-title">Navigation to ${registrationData.recommendedDepartment}</div>
            <table class="navigation-table">
              <thead>
                <tr>
                  <th style="width: 60px;">Step</th>
                  <th>Direction</th>
                  <th>Landmark</th>
                  <th>Floor</th>
                </tr>
              </thead>
              <tbody>
                ${navigationSteps.map((step, index) => `
                  <tr>
                    <td style="font-weight: 600;">${index + 1}</td>
                    <td>${step.direction || '-'}</td>
                    <td>${step.landmark || '-'}</td>
                    <td>${step.floor || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : `
          <div class="section">
            <div class="section-title">Navigation Instructions</div>
            <p style="font-size: 14px; color: var(--muted);">
              Please proceed to the main reception desk for directions to ${registrationData.recommendedDepartment}.
            </p>
          </div>
          `}

          <!-- Floor Plan -->
          ${floorPlanImage ? `
          <div class="section">
            <div class="section-title">Floor Plan</div>
            <div class="floor-plan">
              <img src="${floorPlanImage}" alt="Floor Plan" />
            </div>
          </div>
          ` : ''}

          <!-- Emergency Note -->
          <div class="emergency-note">
            <strong>⚠️ EMERGENCY NOTE</strong><br>
            In case of medical emergency, proceed immediately to the Emergency Department<br>
            Location: Ground Floor, East Wing
          </div>

          <!-- Footer -->
          <div class="footer-meta">
            <div><strong>Issued:</strong> ${formattedDate} ${formattedTime}</div>
            <div><strong>Reference:</strong> ${this.generateVisitId()}</div>
            <div style="margin-left: auto;">CliCare Hospital • Medical Center</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate visit ID
  generateVisitId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `DOC${timestamp}${random}`;
  }

  // Cleanup method
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Print server browser closed');
    }
  }
}

// Export singleton instance
const printServer = new PrintServer();

module.exports = printServer;