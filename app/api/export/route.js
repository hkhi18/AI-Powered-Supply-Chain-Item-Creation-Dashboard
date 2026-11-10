// Excel export of the item master: GET /api/export?status=approved (or draft / rejected / omit for all)
import * as XLSX from 'xlsx';
import { getExportRows } from '@/lib/queries';

export async function GET(request) {
  const status = new URL(request.url).searchParams.get('status') || '';
  const rows = await getExportRows(status);
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((r) => ({
      'Item Ref': r.ref,
      'ERP Item No': r.erp_item_no || '',
      'Description': r.description,
      'UNSPSC Code': r.unspsc_code,
      'UNSPSC Title': r.unspsc_title,
      'Segment': r.segment_title,
      'Family': r.family_title,
      'Class': r.class_title,
      'UOM': r.uom,
      'Manufacturer': r.manufacturer || '',
      'Part Number': r.part_number || '',
      'Status': r.status
    }))
  );
  sheet['!cols'] = [12, 14, 52, 13, 36, 36, 30, 30, 8, 22, 16, 10].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Items');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="scm-items-${status || 'all'}.xlsx"`
    }
  });
}
