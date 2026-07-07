#!/usr/bin/env python3
"""Build ~/Downloads/Neil_Job_Tracker.xlsx from the hub's career data.

Reads data/career-applications.json (+ career-networking.json for contact
info) and writes a single-sheet, one-line-per-field tracker. Re-run any time;
it always overwrites the same file. Run automatically as the last step of
/jobs (see ~/.claude/commands/jobs.md).
"""
import json
import os
from datetime import datetime, timezone

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

HUB = os.path.expanduser('~/Claude/neil-ai-hub')
OUT = os.path.expanduser('~/Downloads/Neil_Job_Tracker.xlsx')

STATUS_ORDER = [
    'To Apply', 'Applied', 'Received Response', 'Did Not Apply',
    'Followed Up', 'Interview Scheduled', 'Interview Completed', 'Offer', 'Rejected',
]
STATUS_COLOR = {
    'To Apply': 'F97316', 'Applied': '2563EB', 'Received Response': '0EA5E9',
    'Did Not Apply': '64748B', 'Followed Up': '06B6D4', 'Interview Scheduled': 'A855F7',
    'Interview Completed': 'F59E0B', 'Offer': '10B981', 'Rejected': '94A3B8',
}
OUTCOME_COLOR = {'Rejected': 'EF4444', 'Follow Up': '10B981', 'Will Be In Touch': 'F59E0B'}

COLUMNS = [
    ('Company', 24), ('Position', 42), ('Status', 17), ('Outcome', 15),
    ('Date Applied', 12), ('Date Posted', 12), ('Salary', 16),
    ('Contact Name', 16), ('Contact LinkedIn', 30), ('Job Posting Link', 30),
    ('Portal / Login Link', 30), ('Gmail Summary', 46), ('Deadline', 12),
]


def tint(hex_color, amount=0.82):
    """Blend a hex color toward white so text stays readable (mimics the app's badge look)."""
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    r = round(r + (255 - r) * amount)
    g = round(g + (255 - g) * amount)
    b = round(b + (255 - b) * amount)
    return f'{r:02X}{g:02X}{b:02X}'


def one_line(text, limit=180):
    if not text:
        return ''
    flat = ' '.join(str(text).split())
    return flat if len(flat) <= limit else flat[:limit - 1] + '…'


def normco(name):
    import re
    return re.sub(r'[^a-z0-9]', '', re.sub(r'\(.*?\)', '', (name or '').lower()))


def batch_of(a):
    return a.get('batch') or (a.get('_created') or '')[:10]


def load(path):
    with open(path) as f:
        return json.load(f).get('data', [])


def match_contact(app, contacts):
    link = app.get('link')
    company = normco(app.get('company'))
    for c in contacts:
        if link and c.get('appLink') and c['appLink'] == link:
            return c
    for c in contacts:
        if normco(c.get('company')) == company:
            return c
    return None


def main():
    apps = load(os.path.join(HUB, 'data', 'career-applications.json'))
    contacts = load(os.path.join(HUB, 'data', 'career-networking.json'))

    def sort_key(a):
        status = a.get('status', 'To Apply')
        rank = STATUS_ORDER.index(status) if status in STATUS_ORDER else len(STATUS_ORDER)
        date = a.get('dateApplied') or batch_of(a) or ''
        return (rank, -_date_ordinal(date))

    rows = sorted(apps, key=sort_key)

    wb = Workbook()
    ws = wb.active
    ws.title = 'Job Tracker'

    n_cols = len(COLUMNS)
    last_col_letter = get_column_letter(n_cols)

    ws.merge_cells(f'A1:{last_col_letter}1')
    title_cell = ws['A1']
    now = datetime.now(timezone.utc).strftime('%b %d, %Y %I:%M %p UTC')
    title_cell.value = f"Neil's Job Application Tracker — updated {now} — {len(rows)} total"
    title_cell.font = Font(bold=True, size=13, color='FFFFFF')
    title_cell.fill = PatternFill('solid', fgColor='1F2937')
    title_cell.alignment = Alignment(horizontal='left', vertical='center', indent=1)
    ws.row_dimensions[1].height = 26

    header_row = 2
    for i, (label, width) in enumerate(COLUMNS, start=1):
        cell = ws.cell(row=header_row, column=i, value=label)
        cell.font = Font(bold=True, color='FFFFFF')
        cell.fill = PatternFill('solid', fgColor='2563EB')
        cell.alignment = Alignment(horizontal='left', vertical='center')
        ws.column_dimensions[get_column_letter(i)].width = width
    ws.row_dimensions[header_row].height = 20

    for r, a in enumerate(rows, start=header_row + 1):
        status = a.get('status', 'To Apply')
        outcome = a.get('gmailOutcome', '')
        contact = match_contact(a, contacts)

        values = [
            a.get('company', ''),
            one_line(a.get('jobTitle', '')),
            status,
            outcome,
            a.get('dateApplied', ''),
            batch_of(a),
            one_line(a.get('salary', '')),
            (contact or {}).get('contactName', ''),
            (contact or {}).get('contactUrl', ''),
            a.get('link', ''),
            a.get('portalLink', ''),
            one_line(a.get('gmailSummary', '')),
            a.get('deadline', ''),
        ]
        for c, val in enumerate(values, start=1):
            cell = ws.cell(row=r, column=c, value=val)
            cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=False)

        status_cell = ws.cell(row=r, column=3)
        status_hex = STATUS_COLOR.get(status, '94A3B8')
        status_cell.fill = PatternFill('solid', fgColor=tint(status_hex))
        status_cell.font = Font(color=status_hex, bold=True)

        if outcome:
            outcome_cell = ws.cell(row=r, column=4)
            outcome_hex = OUTCOME_COLOR.get(outcome, '94A3B8')
            outcome_cell.fill = PatternFill('solid', fgColor=tint(outcome_hex))
            outcome_cell.font = Font(color=outcome_hex, bold=True)

        for col_idx in (9, 10, 11):  # Contact LinkedIn, Job Posting Link, Portal Link
            cell = ws.cell(row=r, column=col_idx)
            if cell.value:
                cell.hyperlink = cell.value
                cell.font = Font(color='2563EB', underline='single')

    last_row = header_row + len(rows)
    if rows:
        table_ref = f'A{header_row}:{last_col_letter}{last_row}'
        table = Table(displayName='JobTracker', ref=table_ref)
        table.tableStyleInfo = TableStyleInfo(
            name='TableStyleMedium2', showRowStripes=True, showFirstColumn=False,
        )
        ws.add_table(table)

    ws.freeze_panes = f'A{header_row + 1}'

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    wb.save(OUT)
    print(f'Wrote {len(rows)} rows to {OUT}')


def _date_ordinal(date_str):
    """Sort-friendly integer for YYYY-MM-DD strings; blank/unparseable sorts as 0 (oldest)."""
    try:
        return int((date_str or '0000-00-00').replace('-', ''))
    except ValueError:
        return 0


if __name__ == '__main__':
    main()
