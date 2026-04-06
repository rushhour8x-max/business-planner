/* ============================================
   Export Module — PDF & Excel
   Dependencies: jsPDF + jspdf-autotable, SheetJS
   ============================================ */
const Export = (() => {

  // ── Excel Export (SheetJS) ──
  function toExcel(data, columns, filename = 'export') {
    if (typeof XLSX === 'undefined') {
      Toast.show('SheetJS library not loaded', 'error');
      return;
    }

    // Build worksheet data
    const wsData = [columns.map(c => c.header)];
    data.forEach(row => {
      wsData.push(columns.map(c => {
        let val = c.accessor(row);
        // Format numbers for Excel
        if (typeof val === 'number') return val;
        return val != null ? String(val) : '';
      }));
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-width columns
    const colWidths = columns.map((c, i) => {
      let maxLen = c.header.length;
      data.forEach(row => {
        const val = String(c.accessor(row) || '');
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(maxLen + 4, 50) };
    });
    ws['!cols'] = colWidths;

    // Style header row (bold) — note: basic XLSX doesn't support styling
    // but the data structure is correct

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    // Generate filename with date
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
    Toast.show(I18n.t('common.success'), 'success');
  }

  // ── PDF Export (jsPDF + AutoTable) ──
  function toPDF(title, data, columns, filename = 'export', options = {}) {
    if (typeof window.jspdf === 'undefined') {
      Toast.show('jsPDF library not loaded', 'error');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: options.landscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ── Header gradient bar ──
    doc.setFillColor(99, 102, 241); // Indigo
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setFillColor(139, 92, 246); // Purple blend
    doc.rect(0, 0, pageWidth * 0.4, 28, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('Business Planner', 14, 12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(title, 14, 20);

    // Date on right
    const dateStr = new Date().toLocaleDateString(I18n.getLang() === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    doc.setFontSize(9);
    doc.text(dateStr, pageWidth - 14, 12, { align: 'right' });

    // Stats summary (if provided)
    let startY = 36;
    if (options.stats && options.stats.length > 0) {
      const statBoxWidth = (pageWidth - 28) / options.stats.length;
      options.stats.forEach((stat, i) => {
        const x = 14 + i * statBoxWidth;
        doc.setFillColor(245, 245, 255);
        doc.roundedRect(x, startY, statBoxWidth - 4, 18, 2, 2, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(99, 102, 241);
        doc.text(String(stat.value), x + (statBoxWidth - 4) / 2, startY + 8, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 140);
        doc.text(stat.label, x + (statBoxWidth - 4) / 2, startY + 14, { align: 'center' });
      });
      startY += 24;
    }

    // ── Table ──
    const head = [columns.map(c => c.header)];
    const body = data.map(row => columns.map(c => {
      let val = c.accessor(row);
      if (val == null) return '';
      if (typeof val === 'number') return val.toLocaleString('vi-VN');
      return String(val);
    }));

    doc.autoTable({
      head,
      body,
      startY,
      theme: 'grid',
      headStyles: {
        fillColor: [99, 102, 241],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: [50, 50, 60],
      },
      alternateRowStyles: {
        fillColor: [248, 248, 255],
      },
      columnStyles: columns.reduce((acc, c, i) => {
        if (c.align) acc[i] = { halign: c.align };
        if (c.width) acc[i] = { ...acc[i], cellWidth: c.width };
        return acc;
      }, {}),
      margin: { top: 10, right: 14, bottom: 20, left: 14 },
      didDrawPage: (data) => {
        // Footer
        const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
        const totalPages = doc.internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 160);
        doc.text(
          `Business Planner — ${title}`,
          14, pageHeight - 8
        );
        doc.text(
          `${pageNum} / ${totalPages}`,
          pageWidth - 14, pageHeight - 8,
          { align: 'right' }
        );
      }
    });

    // Save
    const dateSuffix = new Date().toISOString().slice(0, 10);
    doc.save(`${filename}_${dateSuffix}.pdf`);
    Toast.show(I18n.t('common.success'), 'success');
  }

  // ══════════════════════════════════════════
  //  Module-specific Export Functions
  // ══════════════════════════════════════════

  // ── Business Plans ──
  function exportBusinessPlansExcel() {
    const t = I18n.t.bind(I18n);
    const plans = BusinessPlan.getAll();
    if (plans.length === 0) { Toast.show(t('common.noData'), 'warning'); return; }

    const columns = [
      { header: t('businessPlan.planName'), accessor: p => p.name },
      { header: t('businessPlan.type'), accessor: p => p.planType === 'type1' ? t('businessPlan.type1') : t('businessPlan.type2') },
      { header: t('businessPlan.status'), accessor: p => t('businessPlan.statuses.' + (p.status || 'draft')) },
      { header: t('businessPlan.summary.totalCost'), accessor: p => BusinessPlan.calcTotalCost(p) },
      { header: t('businessPlan.summary.targetRevenue'), accessor: p => BusinessPlan.calcRevenue(p) },
      { header: t('businessPlan.summary.margin'), accessor: p => {
        const cost = BusinessPlan.calcTotalCost(p);
        const rev = BusinessPlan.calcRevenue(p);
        return rev > 0 ? (((rev - cost) / rev) * 100).toFixed(1) + '%' : '0%';
      }},
      { header: t('businessPlan.summary.startDate'), accessor: p => p.startDate || '' },
      { header: t('businessPlan.summary.endDate'), accessor: p => p.endDate || '' },
      { header: t('businessPlan.summary.notes'), accessor: p => p.notes || '' },
    ];

    toExcel(plans, columns, 'business_plans');
  }

  function exportBusinessPlansPDF() {
    const t = I18n.t.bind(I18n);
    const plans = BusinessPlan.getAll();
    if (plans.length === 0) { Toast.show(t('common.noData'), 'warning'); return; }

    const stats = BusinessPlan.getStats();
    const columns = [
      { header: t('businessPlan.planName'), accessor: p => p.name, width: 55 },
      { header: t('businessPlan.type'), accessor: p => p.planType === 'type1' ? t('businessPlan.type1') : t('businessPlan.type2'), width: 30 },
      { header: t('businessPlan.status'), accessor: p => t('businessPlan.statuses.' + (p.status || 'draft')), width: 22 },
      { header: t('businessPlan.summary.totalCost'), accessor: p => BusinessPlan.calcTotalCost(p), align: 'right' },
      { header: t('businessPlan.summary.targetRevenue'), accessor: p => BusinessPlan.calcRevenue(p), align: 'right' },
      { header: t('businessPlan.summary.margin'), accessor: p => {
        const cost = BusinessPlan.calcTotalCost(p);
        const rev = BusinessPlan.calcRevenue(p);
        return rev > 0 ? (((rev - cost) / rev) * 100).toFixed(1) + '%' : '0%';
      }, align: 'center', width: 20 },
    ];

    toPDF(t('businessPlan.title'), plans, columns, 'business_plans', {
      landscape: true,
      stats: [
        { label: t('dashboard.totalPlans'), value: stats.total },
        { label: t('businessPlan.statuses.active'), value: stats.active },
        { label: t('dashboard.totalRevenue'), value: BusinessPlan.formatVND(stats.totalRevenue) },
      ]
    });
  }

  // ── Contracts ──
  function exportContractsExcel() {
    const t = I18n.t.bind(I18n);
    const contracts = Contracts.getAll();
    if (contracts.length === 0) { Toast.show(t('common.noData'), 'warning'); return; }

    const columns = [
      { header: t('contracts.number'), accessor: c => c.number },
      { header: t('contracts.partner'), accessor: c => c.partner },
      { header: t('contracts.type'), accessor: c => t('contracts.types.' + (c.type || 'other')) },
      { header: t('contracts.value'), accessor: c => parseFloat(c.value) || 0 },
      { header: t('contracts.signDate'), accessor: c => c.signDate || '' },
      { header: t('contracts.effectiveDate'), accessor: c => c.effectiveDate || '' },
      { header: t('contracts.expiryDate'), accessor: c => c.expiryDate || '' },
      { header: t('contracts.status'), accessor: c => t('contracts.statuses.' + (c.status || 'drafting')) },
      { header: t('contracts.terms'), accessor: c => c.terms || '' },
    ];

    toExcel(contracts, columns, 'contracts');
  }

  function exportContractsPDF() {
    const t = I18n.t.bind(I18n);
    const contracts = Contracts.getAll();
    if (contracts.length === 0) { Toast.show(t('common.noData'), 'warning'); return; }

    const stats = Contracts.getStats();
    const columns = [
      { header: t('contracts.number'), accessor: c => c.number, width: 30 },
      { header: t('contracts.partner'), accessor: c => c.partner, width: 45 },
      { header: t('contracts.type'), accessor: c => t('contracts.types.' + (c.type || 'other')), width: 22 },
      { header: t('contracts.value'), accessor: c => parseFloat(c.value) || 0, align: 'right' },
      { header: t('contracts.effectiveDate'), accessor: c => c.effectiveDate || '', width: 24 },
      { header: t('contracts.expiryDate'), accessor: c => c.expiryDate || '', width: 24 },
      { header: t('contracts.status'), accessor: c => t('contracts.statuses.' + (c.status || 'drafting')), width: 22 },
    ];

    toPDF(t('contracts.title'), contracts, columns, 'contracts', {
      landscape: true,
      stats: [
        { label: t('common.total'), value: stats.total },
        { label: t('dashboard.activeContracts'), value: stats.active },
        { label: t('dashboard.expiringContracts'), value: stats.expiring },
      ]
    });
  }

  // ── Planning / Tasks ──
  function exportTasksExcel() {
    const t = I18n.t.bind(I18n);
    const tasks = Planning.getAll();
    if (tasks.length === 0) { Toast.show(t('common.noData'), 'warning'); return; }

    const columns = [
      { header: t('planning.taskTitle'), accessor: tk => tk.title },
      { header: t('planning.taskDesc'), accessor: tk => tk.description || '' },
      { header: t('planning.category'), accessor: tk => t('planning.categories.' + (tk.category || 'other')) },
      { header: t('planning.priority'), accessor: tk => t('planning.priorities.' + (tk.priority || 'medium')) },
      { header: t('planning.deadline'), accessor: tk => tk.deadline || '' },
      { header: t('planning.assignee'), accessor: tk => tk.assignee || '' },
      { header: I18n.t('businessPlan.status'), accessor: tk => t('planning.columns.' + (tk.status || 'todo')) },
    ];

    toExcel(tasks, columns, 'tasks');
  }

  function exportTasksPDF() {
    const t = I18n.t.bind(I18n);
    const tasks = Planning.getAll();
    if (tasks.length === 0) { Toast.show(t('common.noData'), 'warning'); return; }

    const stats = Planning.getStats();
    const columns = [
      { header: t('planning.taskTitle'), accessor: tk => tk.title, width: 45 },
      { header: t('planning.category'), accessor: tk => t('planning.categories.' + (tk.category || 'other')), width: 22 },
      { header: t('planning.priority'), accessor: tk => t('planning.priorities.' + (tk.priority || 'medium')), width: 20 },
      { header: t('planning.deadline'), accessor: tk => tk.deadline || '', width: 24 },
      { header: t('planning.assignee'), accessor: tk => tk.assignee || '', width: 22 },
      { header: I18n.t('businessPlan.status'), accessor: tk => t('planning.columns.' + (tk.status || 'todo')), width: 22 },
    ];

    toPDF(t('planning.title'), tasks, columns, 'tasks', {
      stats: [
        { label: t('planning.columns.todo'), value: stats.todo },
        { label: t('planning.columns.inProgress'), value: stats.inProgress },
        { label: t('planning.columns.done'), value: stats.done },
        { label: '⚠️ Overdue', value: stats.overdue },
      ]
    });
  }

  // ── Dashboard Export ──
  function exportDashboardPDF() {
    const t = I18n.t.bind(I18n);
    const bpStats = BusinessPlan.getStats();
    const ctStats = Contracts.getStats();
    const planStats = Planning.getStats();

    if (typeof window.jspdf === 'undefined') {
      Toast.show('jsPDF library not loaded', 'error');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('Business Planner — Dashboard Report', 14, 12);
    const dateStr = new Date().toLocaleDateString(I18n.getLang() === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(dateStr, 14, 20);

    let y = 36;

    // Stats cards
    const dashStats = [
      { label: t('dashboard.totalPlans'), value: bpStats.total, color: [139, 92, 246] },
      { label: t('dashboard.activeContracts'), value: ctStats.active, color: [16, 185, 129] },
      { label: t('dashboard.pendingTasks'), value: planStats.todo + planStats.inProgress, color: [245, 158, 11] },
      { label: t('dashboard.totalRevenue'), value: BusinessPlan.formatVND(bpStats.totalRevenue), color: [59, 130, 246] },
    ];

    const cardW = (pageWidth - 28 - 12) / 4;
    dashStats.forEach((s, i) => {
      const x = 14 + i * (cardW + 4);
      doc.setFillColor(...s.color);
      doc.roundedRect(x, y, cardW, 22, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(String(s.value), x + cardW / 2, y + 10, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(s.label, x + cardW / 2, y + 17, { align: 'center' });
    });

    y += 30;

    // Business Plans table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 60);
    doc.text(t('businessPlan.title'), 14, y);
    y += 4;

    const plans = BusinessPlan.getAll();
    if (plans.length > 0) {
      doc.autoTable({
        head: [[t('businessPlan.planName'), t('businessPlan.type'), t('businessPlan.status'), t('businessPlan.summary.margin')]],
        body: plans.map(p => {
          const cost = BusinessPlan.calcTotalCost(p);
          const rev = BusinessPlan.calcRevenue(p);
          const margin = rev > 0 ? (((rev - cost) / rev) * 100).toFixed(1) + '%' : '0%';
          return [
            p.name,
            p.planType === 'type1' ? t('businessPlan.type1') : t('businessPlan.type2'),
            t('businessPlan.statuses.' + (p.status || 'draft')),
            margin
          ];
        }),
        startY: y,
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // Contracts table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 60);
    doc.text(t('contracts.title'), 14, y);
    y += 4;

    const contracts = Contracts.getAll();
    if (contracts.length > 0) {
      doc.autoTable({
        head: [[t('contracts.number'), t('contracts.partner'), t('contracts.value'), t('contracts.expiryDate'), t('contracts.status')]],
        body: contracts.map(c => [
          c.number,
          c.partner,
          c.value ? parseFloat(c.value).toLocaleString('vi-VN') : '',
          c.expiryDate || '',
          t('contracts.statuses.' + (c.status || 'drafting'))
        ]),
        startY: y,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // Tasks table
    if (y > 250) { doc.addPage(); y = 14; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 60);
    doc.text(t('planning.title'), 14, y);
    y += 4;

    const tasks = Planning.getAll();
    if (tasks.length > 0) {
      doc.autoTable({
        head: [[t('planning.taskTitle'), t('planning.priority'), t('planning.deadline'), t('planning.assignee'), t('businessPlan.status')]],
        body: tasks.map(tk => [
          tk.title,
          t('planning.priorities.' + (tk.priority || 'medium')),
          tk.deadline || '',
          tk.assignee || '',
          t('planning.columns.' + (tk.status || 'todo'))
        ]),
        startY: y,
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11], textColor: [50, 50, 60], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
    }

    doc.save(`dashboard_report_${new Date().toISOString().slice(0, 10)}.pdf`);
    Toast.show(I18n.t('common.success'), 'success');
  }

  // ── Contract DOCX Export (docx.js) ──
  function exportContractDocx(contractId) {
    const t = I18n.t.bind(I18n);

    if (typeof docx === 'undefined') {
      Toast.show('docx.js library not loaded', 'error');
      return;
    }

    const contract = contractId ? Contracts.getAll().find(c => c.id === contractId) : null;
    if (!contract) {
      Toast.show(t('common.noData'), 'warning');
      return;
    }

    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
            WidthType, AlignmentType, BorderStyle, HeadingLevel, ShadingType,
            TableLayoutType } = docx;

    const isVi = I18n.getLang() === 'vi';

    // Helper: create a table row with label + value
    function infoRow(label, value, opts = {}) {
      return new TableRow({
        children: [
          new TableCell({
            width: { size: 3500, type: WidthType.DXA },
            shading: { type: ShadingType.SOLID, color: 'F0F0F8' },
            children: [new Paragraph({
              children: [new TextRun({ text: label, bold: true, size: 22, font: 'Arial' })],
              spacing: { before: 60, after: 60 },
              indent: { left: 120 },
            })],
          }),
          new TableCell({
            width: { size: 6500, type: WidthType.DXA },
            children: [new Paragraph({
              children: [new TextRun({
                text: value || '—',
                size: 22,
                font: 'Arial',
                ...(opts.bold ? { bold: true } : {}),
                ...(opts.color ? { color: opts.color } : {}),
              })],
              spacing: { before: 60, after: 60 },
              indent: { left: 120 },
            })],
          }),
        ],
      });
    }

    // Format date
    function fmtDate(d) {
      if (!d) return '—';
      const dt = new Date(d);
      return dt.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    // Format value
    function fmtValue(v) {
      if (!v) return '—';
      const num = parseFloat(v);
      if (isNaN(num)) return v;
      return num.toLocaleString('vi-VN') + ' VND';
    }

    // Status text
    const statusText = t('contracts.statuses.' + (contract.status || 'drafting'));
    const typeText = t('contracts.types.' + (contract.type || 'other'));

    // Build document
    const doc = new Document({
      creator: 'Business Planner',
      title: `${isVi ? 'Hợp đồng' : 'Contract'} ${contract.number}`,
      description: `${contract.partner}`,
      sections: [{
        properties: {
          page: {
            margin: { top: 1000, right: 1200, bottom: 1000, left: 1200 },
          },
        },
        children: [
          // ── Header ──
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({
              text: isVi ? 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM' : 'SOCIALIST REPUBLIC OF VIETNAM',
              bold: true,
              size: 24,
              font: 'Arial',
            })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({
              text: isVi ? 'Độc lập — Tự do — Hạnh phúc' : 'Independence — Freedom — Happiness',
              size: 22,
              font: 'Arial',
              italics: true,
            })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [new TextRun({
              text: '━━━━━━━━━━━━━━━━━━━━━',
              size: 20,
              color: '6366F1',
            })],
          }),

          // ── Title ──
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 80 },
            children: [new TextRun({
              text: (isVi ? 'HỢP ĐỒNG ' : 'CONTRACT ').toUpperCase() + typeText.toUpperCase(),
              bold: true,
              size: 32,
              font: 'Arial',
              color: '6366F1',
            })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [new TextRun({
              text: `${isVi ? 'Số' : 'No.'}: ${contract.number || '......'}`,
              bold: true,
              size: 24,
              font: 'Arial',
            })],
          }),

          // ── Contract Info Table ──
          new Paragraph({
            spacing: { before: 100, after: 100 },
            children: [new TextRun({
              text: isVi ? 'THÔNG TIN HỢP ĐỒNG' : 'CONTRACT INFORMATION',
              bold: true,
              size: 24,
              font: 'Arial',
              color: '6366F1',
            })],
          }),

          new Table({
            width: { size: 10000, type: WidthType.DXA },
            layout: TableLayoutType.FIXED,
            rows: [
              infoRow(t('contracts.number'), contract.number, { bold: true }),
              infoRow(t('contracts.partner'), contract.partner, { bold: true }),
              infoRow(t('contracts.type'), typeText),
              infoRow(t('contracts.value'), fmtValue(contract.value), { bold: true, color: '6366F1' }),
              infoRow(t('contracts.status'), statusText),
              infoRow(t('contracts.signDate'), fmtDate(contract.signDate)),
              infoRow(t('contracts.effectiveDate'), fmtDate(contract.effectiveDate)),
              infoRow(t('contracts.expiryDate'), fmtDate(contract.expiryDate)),
            ],
          }),

          // ── Terms ──
          new Paragraph({
            spacing: { before: 400, after: 100 },
            children: [new TextRun({
              text: isVi ? 'ĐIỀU KHOẢN CHÍNH' : 'KEY TERMS',
              bold: true,
              size: 24,
              font: 'Arial',
              color: '6366F1',
            })],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({
              text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
              size: 16,
              color: 'CCCCCC',
            })],
          }),
          ...(contract.terms || (isVi ? 'Chưa có điều khoản.' : 'No terms specified.')).split('\n').map(line =>
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [new TextRun({
                text: line,
                size: 22,
                font: 'Arial',
              })],
            })
          ),

          // ── Signature Block ──
          new Paragraph({
            spacing: { before: 600, after: 80 },
            children: [new TextRun({
              text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
              size: 16,
              color: 'CCCCCC',
            })],
          }),

          new Table({
            width: { size: 10000, type: WidthType.DXA },
            layout: TableLayoutType.FIXED,
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 5000, type: WidthType.DXA },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({
                          text: isVi ? 'ĐẠI DIỆN BÊN A' : 'PARTY A',
                          bold: true, size: 22, font: 'Arial',
                        })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 40 },
                        children: [new TextRun({
                          text: isVi ? '(Ký, ghi rõ họ tên)' : '(Sign & print name)',
                          italics: true, size: 18, font: 'Arial', color: '888888',
                        })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 5000, type: WidthType.DXA },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({
                          text: isVi ? 'ĐẠI DIỆN BÊN B' : 'PARTY B',
                          bold: true, size: 22, font: 'Arial',
                        })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 40 },
                        children: [new TextRun({
                          text: isVi ? '(Ký, ghi rõ họ tên)' : '(Sign & print name)',
                          italics: true, size: 18, font: 'Arial', color: '888888',
                        })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Footer
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 800 },
            children: [new TextRun({
              text: `${isVi ? 'Xuất từ Business Planner' : 'Exported from Business Planner'} — ${new Date().toLocaleDateString(isVi ? 'vi-VN' : 'en-US')}`,
              size: 16,
              font: 'Arial',
              color: 'AAAAAA',
              italics: true,
            })],
          }),
        ],
      }],
    });

    // Generate & download
    Packer.toBlob(doc).then(blob => {
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `contract_${(contract.number || 'draft').replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.docx`;
      saveAs(blob, filename);
      Toast.show(t('common.success'), 'success');
    }).catch(err => {
      console.error('DOCX export error:', err);
      Toast.show(t('common.error'), 'error');
    });
  }

  // ── Contracts List DOCX (all contracts summary) ──
  function exportContractsListDocx() {
    const t = I18n.t.bind(I18n);
    const contracts = Contracts.getAll();
    if (contracts.length === 0) { Toast.show(t('common.noData'), 'warning'); return; }

    if (typeof docx === 'undefined') {
      Toast.show('docx.js library not loaded', 'error');
      return;
    }

    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
            WidthType, AlignmentType, ShadingType, TableLayoutType, BorderStyle } = docx;

    const isVi = I18n.getLang() === 'vi';

    // Header row
    const headers = [
      t('contracts.number'), t('contracts.partner'), t('contracts.type'),
      t('contracts.value'), t('contracts.expiryDate'), t('contracts.status')
    ];
    const colWidths = [1600, 2400, 1400, 1800, 1600, 1400];

    const headerRow = new TableRow({
      tableHeader: true,
      children: headers.map((h, i) => new TableCell({
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { type: ShadingType.SOLID, color: '6366F1' },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 60 },
          children: [new TextRun({ text: h, bold: true, size: 20, font: 'Arial', color: 'FFFFFF' })],
        })],
      })),
    });

    const dataRows = contracts.map((c, idx) => {
      const vals = [
        c.number || '',
        c.partner || '',
        t('contracts.types.' + (c.type || 'other')),
        c.value ? parseFloat(c.value).toLocaleString('vi-VN') : '—',
        c.expiryDate || '—',
        t('contracts.statuses.' + (c.status || 'drafting')),
      ];
      return new TableRow({
        children: vals.map((v, i) => new TableCell({
          width: { size: colWidths[i], type: WidthType.DXA },
          shading: idx % 2 === 1 ? { type: ShadingType.SOLID, color: 'F8F8FF' } : undefined,
          children: [new Paragraph({
            spacing: { before: 40, after: 40 },
            indent: { left: 80 },
            children: [new TextRun({ text: v, size: 20, font: 'Arial' })],
          })],
        })),
      });
    });

    const doc = new Document({
      creator: 'Business Planner',
      title: t('contracts.title'),
      sections: [{
        properties: {
          page: {
            margin: { top: 800, right: 800, bottom: 800, left: 800 },
            size: { orientation: 'landscape' },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({
              text: t('contracts.title').toUpperCase(),
              bold: true, size: 30, font: 'Arial', color: '6366F1',
            })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [new TextRun({
              text: `${contracts.length} ${isVi ? 'hợp đồng' : 'contracts'} — ${new Date().toLocaleDateString(isVi ? 'vi-VN' : 'en-US')}`,
              size: 20, font: 'Arial', color: '888888', italics: true,
            })],
          }),
          new Table({
            width: { size: 10200, type: WidthType.DXA },
            layout: TableLayoutType.FIXED,
            rows: [headerRow, ...dataRows],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
            children: [new TextRun({
              text: `Business Planner — ${new Date().toLocaleDateString(isVi ? 'vi-VN' : 'en-US')}`,
              size: 16, font: 'Arial', color: 'AAAAAA', italics: true,
            })],
          }),
        ],
      }],
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `contracts_${new Date().toISOString().slice(0, 10)}.docx`);
      Toast.show(t('common.success'), 'success');
    });
  }

  return {
    // Generic
    toExcel, toPDF,
    // Module-specific
    exportBusinessPlansExcel, exportBusinessPlansPDF,
    exportContractsExcel, exportContractsPDF, exportContractDocx, exportContractsListDocx,
    exportTasksExcel, exportTasksPDF,
    exportDashboardPDF,
  };
})();
