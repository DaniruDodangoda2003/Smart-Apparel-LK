import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Colors
const NAVY = [15, 23, 42];
const BLUE = [30, 64, 175];
const DARK = [31, 41, 55];
const GRAY = [107, 114, 128];
const LIGHT_BG = [248, 250, 252];
const WHITE = [255, 255, 255];
const GREEN = [21, 128, 61];
const RED = [185, 28, 28];

function addHeader(doc, runId) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...WHITE);
  doc.text('Smart Apparel-LK', 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 200, 255);
  doc.text('Fabric Waste Assessment Report', 14, 19);
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text('Run: ' + runId, pageW - 14, 12, { align: 'right' });
  doc.text('Report Date: ' + dateStr, pageW - 14, 19, { align: 'right' });
}

function addFooter(doc, runId) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pageCount = doc.internal.getNumberOfPages();
  const refSuffix = Date.now().toString().slice(-6);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(14, pageH - 14, pageW - 14, pageH - 14);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text('Smart Apparel-LK  |  C2 Fabric Waste Intelligence', 14, pageH - 9);
    doc.text('Page ' + i + ' of ' + pageCount, pageW / 2, pageH - 9, { align: 'center' });
    doc.text('REF-' + runId + '-' + refSuffix, pageW - 14, pageH - 9, { align: 'right' });
  }
}

function sectionHeading(doc, y, label) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(240, 245, 255);
  doc.rect(14, y, pageW - 28, 8, 'F');
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.6);
  doc.line(14, y + 8, pageW - 14, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text(label, 16, y + 5.8);
  return y + 12;
}

function checkPageBreak(doc, y, needed) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 22) {
    doc.addPage();
    addHeader(doc, doc._c2RunId);
    return 36;
  }
  return y;
}

/**
 * Generates a professional A4 PDF report for a C2 Fabric Waste run.
 * Returns true on success.
 */
export function generateC2Pdf({
  runData,
  erpDraft,
  preCutDraft,
  cadDraft,
  contributors,
  strategies,
  runState,
  isLowWaste
}) {
  if (!runData) return false;

  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc._c2RunId = runData.run_id;

    const threshold = parseFloat(preCutDraft?.review_threshold || 8);
    const approvalStatus = runState?.approval_status || 'NOT_REQUESTED';
    const selectedStrategyId = runState?.selected_strategy_id || null;
    const selectedStrategy = strategies?.find(s => s.strategy_id === selectedStrategyId);
    const pageW = doc.internal.pageSize.getWidth();

    // --- PAGE 1 ---
    addHeader(doc, runData.run_id);
    let y = 36;

    // --- A. Run Information ---
    y = sectionHeading(doc, y, 'A.  Run Information');
    const t1 = autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: DARK, lineColor: [220, 220, 220], lineWidth: 0.2 },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [250, 251, 252] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 35, fillColor: LIGHT_BG },
        1: { cellWidth: 48 },
        2: { fontStyle: 'bold', cellWidth: 35, fillColor: LIGHT_BG },
        3: { cellWidth: 'auto' }
      },
      body: [
        ['Run ID', runData.run_id, 'Factory ID', runData.factory_id || erpDraft?.factory_id || 'N/A'],
        ['Batch ID', runData.batch_id, 'Shift', preCutDraft?.shift || 'N/A'],
        ['Order ID', runData.order_id, 'Operation Date', new Date().toLocaleDateString('en-GB')],
        ['Style ID', runData.style_id, 'Marker ID', runData.marker_id],
      ],
    });
    y = (t1 && t1.finalY ? t1.finalY : doc.lastAutoTable.finalY) + 8;

    // --- B. Input Summary ---
    y = checkPageBreak(doc, y, 60);
    y = sectionHeading(doc, y, 'B.  Input Summary');

    const erpInputs = [
      'Qty: ' + (erpDraft?.draft_order_quantity || 'N/A'),
      'GSM: ' + (erpDraft?.gsm || 'N/A'),
      'Supplier: ' + (erpDraft?.supplier || 'N/A'),
      'Lot: ' + (erpDraft?.lot || 'N/A'),
    ].join('\n');
    const cadInputs = [
      'Efficiency: ' + (cadDraft?.marker_efficiency || 'N/A') + '%',
      'Length: ' + (cadDraft?.marker_length || 'N/A') + 'm',
      'Width: ' + (cadDraft?.marker_width || 'N/A') + 'mm',
      'Pieces: ' + (cadDraft?.pattern_piece_count || 'N/A'),
    ].join('\n');
    const preCutInputs = [
      'Plies: ' + (preCutDraft?.number_of_plies || 'N/A'),
      'Spread: ' + (preCutDraft?.spread_length || 'N/A') + 'm',
      'Defects/lay: ' + (preCutDraft?.defects_per_lay ?? 'N/A'),
      'End allow: ' + (preCutDraft?.end_allowance || 'N/A') + 'cm',
      'Machine width: ' + (preCutDraft?.machine_width || 'N/A') + 'mm',
    ].join('\n');

    const t2 = autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, textColor: DARK, lineColor: [220, 220, 220], lineWidth: 0.2 },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 42, fillColor: LIGHT_BG },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 28, halign: 'center' },
      },
      head: [['Input Domain', 'Key Inputs', 'Status']],
      body: [
        ['ERP / Material', erpInputs, 'Validated'],
        ['CAD / Marker', cadInputs, 'Validated'],
        ['Pre-cut Operations', preCutInputs, 'Validated'],
      ],
      didParseCell: function(data) {
        if (data.column.index === 2 && data.section === 'body') {
          data.cell.styles.textColor = GREEN;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
    y = (t2 && t2.finalY ? t2.finalY : doc.lastAutoTable.finalY) + 8;

    // --- C. Waste Assessment ---
    y = checkPageBreak(doc, y, 60);
    y = sectionHeading(doc, y, 'C.  Waste Assessment');
    const wasteBody = [
      ['Predicted Waste Rate', runData.predicted_realised_waste_pct + '%'],
      ['Review Threshold', threshold + '%'],
      ['Risk Status', isLowWaste ? 'NORMAL' : 'HIGH'],
      ['Issued Fabric Weight', runData.issued_fabric_weight_kg !== undefined ? runData.issued_fabric_weight_kg + ' kg' : 'N/A'],
      ['Estimated Waste Weight', runData.estimated_waste_weight_kg !== undefined ? runData.estimated_waste_weight_kg + ' kg' : 'N/A'],
      ['Fabric Cost Basis', runData.fabric_cost_basis_lkr_per_kg !== undefined ? 'LKR ' + runData.fabric_cost_basis_lkr_per_kg + '/kg' : 'N/A'],
      ['Estimated Material-Loss Value', runData.estimated_waste_value_lkr !== undefined ? 'LKR ' + runData.estimated_waste_value_lkr.toLocaleString() : 'N/A'],
    ];

    const t3 = autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 3, textColor: DARK, lineColor: [220, 220, 220], lineWidth: 0.2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70, fillColor: LIGHT_BG },
        1: { halign: 'right', fontStyle: 'bold' },
      },
      body: wasteBody,
      didParseCell: function(data) {
        if (data.section === 'body') {
          if (data.row.index === 0) {
            data.cell.styles.fillColor = [239, 246, 255];
            if (data.column.index === 1) data.cell.styles.textColor = BLUE;
          }
          if (data.row.index === 2 && data.column.index === 1) {
            data.cell.styles.textColor = isLowWaste ? GREEN : RED;
          }
          if (data.row.index === 6) {
            data.cell.styles.fillColor = [254, 242, 242];
            if (data.column.index === 1) data.cell.styles.textColor = RED;
          }
        }
      },
    });
    y = (t3 && t3.finalY ? t3.finalY : doc.lastAutoTable.finalY) + 6;

    // --- D. Calculation Summary ---
    y = checkPageBreak(doc, y, 30);
    y = sectionHeading(doc, y, 'D.  Calculation Summary');

    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, y, pageW - 28, 22, 2, 2, 'F');
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);

    const wt = runData.issued_fabric_weight_kg !== undefined ? runData.issued_fabric_weight_kg + ' kg' : 'N/A';
    const ww = runData.estimated_waste_weight_kg !== undefined ? runData.estimated_waste_weight_kg + ' kg' : 'N/A';
    const cb = runData.fabric_cost_basis_lkr_per_kg !== undefined ? 'LKR ' + runData.fabric_cost_basis_lkr_per_kg + '/kg' : 'N/A';
    const wv = runData.estimated_waste_value_lkr !== undefined ? 'LKR ' + runData.estimated_waste_value_lkr.toLocaleString() : 'N/A';

    doc.text(wt + '  x  ' + runData.predicted_realised_waste_pct + '%  =  ' + ww, 18, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('(Issued fabric weight x predicted waste rate = estimated waste weight)', 18, y + 12);

    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(ww + '  x  ' + cb + '  =  ' + wv, 18, y + 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('(Estimated waste weight x cost basis = estimated material-loss value)', 18, y + 22);
    y += 30;

    // --- E. Decision Status ---
    y = checkPageBreak(doc, y, 40);
    y = sectionHeading(doc, y, 'E.  Decision Status');

    const decisionBody = [
      ['Selected Path', isLowWaste ? 'Baseline Path' : (selectedStrategy?.strategy_name || 'None')],
      ['Approval Status', isLowWaste ? 'Not required for baseline path' : approvalStatus],
    ];

    const t4 = autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 3, textColor: DARK, lineColor: [220, 220, 220], lineWidth: 0.2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70, fillColor: LIGHT_BG },
        1: { fontStyle: 'bold' },
      },
      body: decisionBody,
    });
    y = (t4 && t4.finalY ? t4.finalY : doc.lastAutoTable.finalY) + 4;

    // Strategy metrics for high-waste
    if (!isLowWaste && selectedStrategy) {
      y = checkPageBreak(doc, y, 25);
      const t5 = autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2.5, textColor: DARK, lineColor: [220, 220, 220], lineWidth: 0.2 },
        headStyles: { fillColor: [30, 64, 175], textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
        head: [['Predicted Waste', 'Efficiency', 'Fabric Saving', 'Manufacturability']],
        body: [[
          selectedStrategy.predicted_waste_pct + '%',
          selectedStrategy.marker_efficiency + '%',
          selectedStrategy.estimated_fabric_saving + ' kg',
          selectedStrategy.manufacturability,
        ]],
      });
      y = (t5 && t5.finalY ? t5.finalY : doc.lastAutoTable.finalY) + 4;
    }
    y += 4;

    // --- F. Contributor Summary ---
    y = checkPageBreak(doc, y, 35);
    y = sectionHeading(doc, y, 'F.  Contributor Summary');

    if (contributors && contributors.length > 0) {
      const t6 = autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2.5, textColor: DARK, lineColor: [220, 220, 220], lineWidth: 0.2 },
        headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
        head: [['Contributor', 'Direction', 'Contribution']],
        body: contributors.map(function(c) {
          return [
            c.display_label,
            c.contribution_direction === 'INCREASE' ? 'Increased predicted waste' : 'Reduced predicted waste',
            (c.contribution_value > 0 ? '+' : '') + c.contribution_value.toFixed(2) + '%',
          ];
        }),
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'center', fontSize: 7.5 },
          2: { halign: 'right', fontStyle: 'bold' },
        },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 2) {
            var val = parseFloat(data.cell.raw);
            data.cell.styles.textColor = val > 0 ? RED : GREEN;
          }
        }
      });
      y = (t6 && t6.finalY ? t6.finalY : doc.lastAutoTable.finalY) + 8;
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text('No contributor record available for this run.', 16, y + 4);
      y += 12;
    }

    // --- G. Post-cut Validation ---
    if (runState?.validation?.actual_waste_percent) {
      y = checkPageBreak(doc, y, 35);
      y = sectionHeading(doc, y, 'G.  Post-cut Validation');

      var actual = parseFloat(runState.validation.actual_waste_percent);
      var variance = actual - runData.predicted_realised_waste_pct;

      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 3, textColor: DARK, lineColor: [220, 220, 220], lineWidth: 0.2 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 70, fillColor: LIGHT_BG },
          1: { fontStyle: 'bold', halign: 'right' },
        },
        body: [
          ['Actual Waste Percentage', runState.validation.actual_waste_percent + '%'],
          ['Predicted Waste Percentage', runData.predicted_realised_waste_pct + '%'],
          ['Variance', (variance > 0 ? '+' : '') + variance.toFixed(1) + ' percentage points'],
          ['Validation Status', 'Recorded'],
        ],
        didParseCell: function(data) {
          if (data.section === 'body' && data.row.index === 2 && data.column.index === 1) {
            data.cell.styles.textColor = variance > 0 ? RED : GREEN;
          }
          if (data.section === 'body' && data.row.index === 3 && data.column.index === 1) {
            data.cell.styles.textColor = GREEN;
          }
        }
      });
    }

    // --- Footer on all pages ---
    addFooter(doc, runData.run_id);

    // --- Save ---
    doc.save('C2_WasteReport_' + runData.run_id + '.pdf');
    return true;
  } catch (err) {
    console.error('C2 PDF generation failed:', err);
    alert('PDF generation failed. Check console for details.');
    return false;
  }
}
