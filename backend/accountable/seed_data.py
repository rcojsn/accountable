"""Fixed lists of fictional South African companies, people and deal names for the seed.

Every name here is made up. Any match with a real business or person is by chance.
"""

# (name, industry, website)
ORGANIZATIONS = [
    ("Karoo Freight Solutions", "Logistics", "karoofreight.example"),
    ("Bluegum Foods", "Food and beverage", "bluegumfoods.example"),
    ("Highveld Steel Works", "Manufacturing", "highveldsteel.example"),
    ("Cape Harbour Marine", "Maritime", "capeharbour.example"),
    ("Protea Health Partners", "Healthcare", "proteahealth.example"),
    ("Springbok Solar", "Energy", "springboksolar.example"),
    ("Umhlanga Property Group", "Property", "umhlangaproperty.example"),
    ("Drakensberg Outfitters", "Retail", "drakensbergoutfitters.example"),
    ("Baobab Financial Services", "Financial services", "baobabfinancial.example"),
    ("Kalahari Mining Supplies", "Mining", "kalaharimining.example"),
    ("Jacaranda Learning", "Education", "jacarandalearning.example"),
    ("Fynbos Wines", "Food and beverage", "fynboswines.example"),
    ("Lowveld Agri Co-op", "Agriculture", "lowveldagri.example"),
    ("Ubuntu Telecom", "Telecommunications", "ubuntutelecom.example"),
    ("Table Bay Hotels", "Hospitality", "tablebayhotels.example"),
]

# Used for the large dataset, combined into 600 distinct company names.
ORG_PREFIXES = [
    "Karoo", "Cape", "Highveld", "Bluegum", "Protea", "Springbok", "Baobab", "Kalahari", "Jacaranda", "Fynbos",
    "Lowveld", "Ubuntu", "Namaqua", "Swartland", "Overberg", "Soweto", "Tugela", "Limpopo", "Mpumalanga", "Zululand",
    "Eastern Cape", "Free State", "Garden Route", "Winelands", "Waterberg", "Cederberg", "Drakensberg", "Magaliesberg", "Platinum", "Sunbird",
]
ORG_SUFFIXES = [
    "Logistics", "Foods", "Engineering", "Marine", "Health", "Solar", "Properties", "Retail", "Financial", "Mining",
    "Learning", "Estates", "Agri", "Telecom", "Hotels", "Construction", "Insurance", "Motors", "Media", "Water",
]
INDUSTRIES = [
    "Logistics", "Food and beverage", "Manufacturing", "Maritime", "Healthcare", "Energy", "Property", "Retail",
    "Financial services", "Mining", "Education", "Agriculture", "Telecommunications", "Hospitality",
]

FIRST_NAMES = [
    "Thandi", "Lerato", "Sipho", "Nomsa", "Pieter", "Johan", "Aisha", "Priya", "Thabo", "Zanele",
    "Kagiso", "Ayanda", "Riaan", "Elmarie", "Mandla", "Naledi", "Imran", "Fatima", "Bongani", "Palesa",
    "Werner", "Annelie", "Sibusiso", "Refilwe", "Yusuf", "Chantelle", "Themba", "Lindiwe", "Keith", "Megan",
    "Vusi", "Busisiwe", "Dewald", "Nokuthula", "Kobus", "Tumelo", "Ashraf", "Karabo", "Hendrik", "Zodwa",
]
LAST_NAMES = [
    "Mokoena", "Khumalo", "Nkosi", "van der Merwe", "Naidoo", "Pillay", "Botha", "Dlamini", "Molefe", "Mahlangu",
    "Venter", "Sithole", "Govender", "Jacobs", "Mthembu", "Pretorius", "Ndlovu", "Cele", "Smit", "Radebe",
    "Moodley", "du Plessis", "Zulu", "Fourie", "Maseko", "Lombard", "Tshabalala", "Kruger", "Ismail", "Mabaso",
    "Coetzee", "Sibiya", "Abrahams", "Mashaba", "Steyn", "Nel", "Baloyi", "Joubert", "Hlongwane", "Meyer",
]
JOB_TITLES = [
    "Operations Manager", "Finance Director", "Procurement Lead", "Managing Director", "IT Manager",
    "Head of Sales", "Facilities Manager", "Chief Operating Officer", "Marketing Manager", "Supply Chain Manager",
    "HR Manager", "Business Development Manager", "Plant Manager", "Owner",
]

DEAL_NAMES = [
    "Warehouse automation", "Fleet tracking rollout", "ERP replacement", "Website redesign", "Solar installation",
    "Backup power upgrade", "Point-of-sale refresh", "Staff training programme", "Cold chain monitoring",
    "Cloud migration", "Payroll system", "Security camera upgrade", "Packaging line upgrade", "Customer portal",
    "Data centre refresh", "Mobile ordering app", "Maintenance contract", "Compliance audit", "Network upgrade",
    "Inventory system", "Energy efficiency review", "Delivery route planning", "Accounting software", "Call centre tools",
    "Document management", "Water recycling plant", "Branch rollout", "Quality control system", "Vehicle fit-out", "Annual support plan",
]

NOTE_TEXTS = [
    "Prefers WhatsApp for quick questions",
    "Budget is approved for this financial year",
    "Decision needs sign-off from the board",
    "Wants a reference from a similar customer",
    "Concerned about the installation timeline",
    "Competitor quote is lower; we compete on support",
    "Happy with the pilot results",
    "Asked us to include training in the price",
    "Office is closed over the December shutdown",
    "Introduced us to their finance team",
]
CALL_TEXTS = [
    "Intro call to understand their needs",
    "Walked through pricing",
    "Checked in on the timeline",
    "Discussed the contract terms",
    "Call about the site visit",
    "Answered questions on integration",
    "Left a voicemail",
    "Spoke about next quarter's budget",
]
EMAIL_TEXTS = [
    "Sent the proposal",
    "Sent the revised quote",
    "Shared two case studies",
    "Sent meeting notes and next steps",
    "Sent the draft contract",
    "Asked for their purchase order",
    "Shared the implementation plan",
    "Replied to their questions on support hours",
]
FOLLOW_UP_TEXTS = [
    "Call back about the quote",
    "Send the updated proposal",
    "Check whether the contract was signed",
    "Confirm the site visit date",
    "Chase the purchase order",
    "Ask about the board decision",
    "Share the training schedule",
    "Book a demo for their team",
]
