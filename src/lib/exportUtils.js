import { jsPDF } from 'jspdf';

export function exportExcel(schools, filename) {
    const headers = ['School Name', 'LGA', 'Type', 'Address', 'Phone', 'Email', 'Total Students', 'Boys', 'Girls', 'Interest Level'];
    let html = '<table border="1" cellspacing="0" cellpadding="6" style="font-family:Arial;font-size:11px;border-collapse:collapse;">';
    html += '<tr>';
    headers.forEach(h => { html += `<th style="background:#2e7d32;color:white;font-weight:bold;">${h}</th>`; });
    html += '</tr>';
    for (const s of schools) {
        html += '<tr>';
        html += `<td>${escapeHtml(s.school_name || '')}</td>`;
        html += `<td>${escapeHtml(s.lga || '')}</td>`;
        html += `<td>${escapeHtml(s.school_type || '')}</td>`;
        html += `<td>${escapeHtml(s.address || '')}</td>`;
        html += `<td>${escapeHtml(s.phone_number || '')}</td>`;
        html += `<td>${escapeHtml(s.email || '')}</td>`;
        html += `<td>${s.total_population ?? 'N/A'}</td>`;
        html += `<td>${s.boys_population ?? 'N/A'}</td>`;
        html += `<td>${s.girls_population ?? 'N/A'}</td>`;
        html += `<td>${escapeHtml(s.interest_level || 'Not Contacted')}</td>`;
        html += '</tr>';
    }
    html += '</table>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function exportPDF(schools, salespersonName) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(46, 125, 50);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`${salespersonName} - Assigned Schools`, 10, 13);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Exported: ${new Date().toLocaleDateString()}`, pageWidth - 60, 13);

    // Table headers
    let y = 28;
    const colWidths = [60, 30, 25, 55, 35, 35, 20, 15, 15, 30];
    const headers = ['School Name', 'LGA', 'Type', 'Address', 'Phone', 'Email', 'Total', 'Boys', 'Girls', 'Interest'];
    const startX = 5;

    doc.setFillColor(230, 230, 230);
    doc.rect(startX, y - 5, colWidths.reduce((a, b) => a + b, 0), 6, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    let x = startX + 1;
    headers.forEach((h, i) => { doc.text(h, x, y); x += colWidths[i]; });

    // Table rows
    doc.setFont(undefined, 'normal');
    y += 5;
    schools.forEach((s, idx) => {
        if (y > 195) { doc.addPage(); y = 20; }
        if (idx % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(startX, y - 4, colWidths.reduce((a, b) => a + b, 0), 5, 'F');
        }
        x = startX + 1;
        const cells = [
            truncate(s.school_name || '', 35),
            truncate(s.lga || '', 18),
            truncate(s.school_type || '', 15),
            truncate(s.address || '', 32),
            truncate(s.phone_number || '', 20),
            truncate(s.email || '', 20),
            String(s.total_population ?? 'N/A'),
            String(s.boys_population ?? 'N/A'),
            String(s.girls_population ?? 'N/A'),
            truncate(s.interest_level || 'Not Contacted', 18),
        ];
        cells.forEach((c, i) => { doc.text(String(c), x, y); x += colWidths[i]; });
        y += 5;
    });

    doc.save(`${salespersonName}_Schools.pdf`);
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncate(str, max) {
    return str.length > max ? str.slice(0, max) + '...' : str;
}