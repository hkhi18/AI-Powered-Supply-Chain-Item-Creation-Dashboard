# AI-Powered Supply Chain Item Creation Dashboard

An intelligent web application designed to streamline Supply Chain Management (SCM) item master creation through an AI-powered chatbot and structured dashboard.

### Key Features
- **AI Chatbot:** Creates structured item records from natural-language descriptions in Arabic and English.
- **UNSPSC Classification:** Searches a database of 71,924 goods codes to identify appropriate item classifications.
- **Standardized Descriptions:** Generates uppercase, standardized item descriptions with the noun first.
- **Duplicate Detection:** Checks item descriptions and manufacturer part numbers to prevent duplicate records.
- **Draft Approval Workflow:** Saves proposed items as drafts for reviewer approval or rejection.
- **Dashboard Analytics:** Displays KPIs, item statistics, UNSPSC segment charts, and recent activity.
- **Manual Item Creation:** Provides a searchable UNSPSC picker for manual entry.
- **Excel Export:** Exports item records for reporting and further analysis.

### Technology Stack
- Next.js 16
- React
- PostgreSQL / PGlite
- Gemini AI
- UNSPSC Classification
- Plotly
- Excel Export

### Workflow
1. Describe an item in Arabic or English.
2. Generate a standardized item description.
3. Search and validate its UNSPSC classification.
4. Check for duplicate records.
5. Review the proposed item.
6. Save as a draft for approval.

### Important
The current version does not include authentication or role-based access control. It should not be exposed publicly until appropriate access controls are implemented.
