// Rule-based category inference from a free-text description.
// Goal: handle the common day-to-day expense vocabulary well enough
// that "Pick a category" disappears as a step. Falls back to "Others".
//
// Matching rules:
//   - single-word keywords match only on full token boundaries
//     (so "book" matches "Book club" but NOT "Facebook")
//   - multi-word phrases ("ice cream", "dog food") match as substrings
//   - on ties, the longest matched keyword wins (more specific → better)

const KEYWORDS = {
  Dining: [
    // meals & food
    "food", "meal", "meals", "snack", "snacks", "eat", "ate", "eaten",
    "eating", "lunch", "dinner", "breakfast", "brunch", "supper", "feast",
    "buffet", "thali", "tiffin", "treat", "treats", "treated",
    "dine", "dine out", "dine-out", "dine in", "dine-in", "eat out",
    "eat-out", "eating out", "midnight snack", "appetizer", "appetizers",
    "starter", "starters", "main course", "veg", "non-veg", "non veg",
    "vegetarian", "non vegetarian", "fast food", "junk food", "comfort food",
    "happy hour",
    // dishes
    "pizza", "burger", "burgers", "sandwich", "sandwiches", "wrap", "wraps",
    "pasta", "noodles", "biryani", "biriyani", "biryanis", "fried rice",
    "curry", "curries", "dosa", "idli", "samosa", "samosas",
    "vada", "paneer", "kebab", "kebabs", "kabab", "tandoor", "naan",
    "roti", "paratha", "chapati", "thali", "chole", "rajma", "dal makhani",
    "khichdi", "poha", "upma", "uttapam", "appam", "puttu", "rasam",
    "sambar", "raita", "papad", "pickle",
    "butter chicken", "chicken tikka", "tikka masala", "shawarma",
    "falafel", "hummus", "sushi", "sashimi", "ramen", "pho", "tacos",
    "burrito", "burritos", "nachos", "momos", "dumplings", "dim sum",
    "fish curry", "prawns", "shrimp", "lobster", "crab", "fries", "fritters",
    "salad", "salads", "soup", "omelette", "pancake", "pancakes",
    "waffle", "waffles", "croissant", "muffin", "muffins", "donut",
    "donuts", "doughnut", "doughnuts", "cookies", "brownies", "cake",
    "pastry", "dessert", "desserts", "ice cream", "icecream", "kulfi",
    "gulab jamun", "rasgulla", "jalebi", "ladoo", "barfi", "rasmalai",
    "ras malai", "kheer", "halwa", "peda", "modak", "imarti", "soan papdi",
    // street food
    "pani puri", "panipuri", "golgappa", "golgappe", "chaat", "bhel",
    "bhel puri", "sev puri", "dahi puri", "ragda", "samosa chaat",
    "vada pav", "vadapav", "pav bhaji", "pavbhaji", "frankie", "kachori",
    "dabeli", "bhajiya", "pakora", "pakoras", "kati roll", "rolls",
    // venues
    "restaurant", "restaurants", "restro", "cafe", "coffee shop", "diner",
    "bistro", "dhaba", "bakery", "buffet", "eatery", "brewery", "pub",
    "bar", "lounge", "nightclub", "food court", "street food", "stall",
    "food truck", "food cart", "canteen", "mess",
    // drinks
    "coffee", "tea", "chai", "latte", "espresso", "cappuccino",
    "mocha", "americano", "matcha", "milkshake", "shake", "shakes", "juice",
    "juices", "smoothie", "smoothies", "lassi", "soda", "coke", "pepsi",
    "sprite", "fanta", "thums up", "limca", "redbull", "red bull",
    "beverage", "beverages", "soft drink", "soft drinks",
    "beer", "wine", "drinks", "alcohol", "cocktail", "cocktails", "mocktail",
    "mocktails", "whiskey", "whisky", "vodka", "rum", "gin", "tequila",
    "champagne", "sake", "scotch",
    // brands & apps
    "swiggy", "zomato", "dineout", "ubereats", "uber eats", "starbucks",
    "mcdonald", "mcd", "kfc", "subway", "dominos", "domino's",
    "pizzahut", "pizza hut", "burger king", "haldiram", "haldirams",
    "haldiram's", "barbeque nation", "behrouz", "fasoos", "freshmenu",
    "wow momos", "chai point", "chaayos", "blue tokai", "sleepy owl",
    "third wave coffee", "third wave", "bikanervala", "saravana bhavan",
    "anand sweets", "thalassery", "rebel foods",
    // cuisines
    "italian", "mexican", "japanese", "thai", "chinese", "indian food",
    "south indian", "north indian", "punjabi", "mughlai", "continental",
    "korean", "korean food", "vietnamese", "lebanese", "mediterranean",
    "greek food", "spanish food", "french food", "afghani",
  ],

  Groceries: [
    "grocery", "groceries", "supermarket", "kirana", "kirana store",
    "general store", "provision store", "sabzi", "sabzi mandi", "mandi",
    "essentials", "essential items", "household supplies", "ration",
    // produce
    "vegetable", "vegetables", "veggie", "veggies", "fruit", "fruits",
    "banana", "apple", "apples", "mango", "mangoes", "oranges", "grapes",
    "watermelon", "papaya", "guava", "pineapple", "strawberry",
    "strawberries", "kiwi", "pear", "litchi", "lychee", "pomegranate",
    "potato", "potatoes", "onion", "onions", "tomato", "tomatoes",
    "cucumber", "carrot", "carrots", "spinach", "palak", "broccoli",
    "cauliflower", "cabbage", "capsicum", "bell pepper", "okra",
    "ladyfinger", "bhindi", "eggplant", "brinjal", "baingan", "beetroot",
    "drumstick", "lemon", "lemons", "lime", "mushroom", "mushrooms",
    "corn", "peas", "beans", "green peas",
    // staples
    "milk", "bread", "eggs", "butter", "ghee", "cheese", "paneer",
    "yogurt", "curd", "dahi",
    "flour", "atta", "maida", "rice", "basmati", "dal", "daal",
    "lentil", "lentils", "chickpea", "chickpeas", "rajma",
    "oil", "olive oil", "mustard oil", "refined oil", "sugar", "salt",
    "masala", "spices", "haldi", "turmeric", "jeera", "cumin",
    "dhania", "coriander", "ginger", "garlic", "chilli", "chillies",
    "mint", "curry leaves", "cardamom", "elaichi", "cinnamon", "dalchini",
    "tea bag", "tea bags", "coffee powder", "tea powder",
    "honey", "jam", "biscuits", "chips", "namkeen",
    "diapers", "baby food", "formula", "wipes",
    "dog food", "cat food", "pet food", "pet supplies",
    // brands & apps
    "bigbasket", "big basket", "dmart", "d-mart", "dmart ready",
    "reliance fresh", "reliance smart", "more supermarket", "more retail",
    "spencers", "spencer's", "instamart", "blinkit", "zepto", "jiomart",
    "jio mart", "amazon fresh", "country delight", "fraazo", "supr daily",
    "milk basket", "milkbasket", "fresh to home", "freshtohome",
    "licious", "natures basket",
  ],

  Travel: [
    // cabs & rides
    "uber", "ola", "rapido", "lyft", "taxi", "taxis", "cab", "cabs",
    "auto", "rickshaw", "tuktuk", "tuk-tuk", "namma yatri", "indrive",
    "blusmart", "ride", "rides", "riding", "carpool", "car pool",
    "commute", "commuting", "drop", "pickup",
    // flights
    "flight", "flights", "airfare", "airlines", "airport", "indigo",
    "vistara", "spicejet", "spice jet", "air india", "akasa", "go air",
    "goair", "emirates", "qatar airways", "etihad", "lufthansa",
    "british airways", "singapore airlines", "thai airways",
    // trains & buses
    "train", "trains", "irctc", "railway", "rail", "tatkal", "vande bharat",
    "rajdhani", "shatabdi",
    "bus", "buses", "redbus", "red bus", "msrtc", "ksrtc", "tsrtc",
    "ksrtc", "apsrtc", "intercity", "volvo", "sleeper bus",
    "metro", "monorail", "local train",
    // fuel
    "fuel", "petrol", "diesel", "gas station", "petrol pump", "iocl",
    "bpcl", "hpcl", "indian oil", "shell", "bp", "ev charging",
    "charging station", "cng", "lpg vehicle",
    // stays
    "hotel", "hotels", "airbnb", "booking.com", "booking", "oyo", "fab",
    "treebo", "makemytrip", "goibibo", "yatra", "ixigo", "cleartrip",
    "agoda", "expedia", "trivago", "trip.com", "ease my trip", "easemytrip",
    "resort", "resorts", "homestay", "homestays", "hostel", "lodge",
    "inn", "guest house", "stay", "stays", "villa",
    // trip-ish
    "travel", "trip", "trips", "tour", "tours", "vacation", "vacations",
    "vacay", "holiday", "holidays", "getaway", "getaways", "outing", "outings",
    "staycation", "sightseeing", "excursion", "road trip", "roadtrip",
    "weekend trip", "weekend getaway", "camping", "trekking", "trek",
    "treks", "hike", "hiking", "safari", "cruise", "honeymoon",
    "scuba", "scuba diving", "snorkeling", "rafting", "paragliding",
    "skiing", "kayaking", "bungee", "bungee jumping",
    "explore", "exploring", "drive", "driving", "road trip",
    // misc
    "ticket", "tickets", "boarding pass", "boarding", "luggage", "suitcase",
    "backpack", "duffle", "passport", "visa", "visas", "forex",
    "currency exchange", "travel insurance",
    "parking", "toll", "toll tax", "fastag", "fastag recharge",
    "metro recharge", "metro card", "metro card recharge", "valet",
    "valet parking",
  ],

  Entertainment: [
    "movie", "movies", "cinema", "film", "films", "movie ticket",
    "movie tickets", "screening",
    "pvr", "inox", "imax", "miraj", "carnival cinemas",
    "bookmyshow", "book my show", "paytm insider", "district",
    "concert", "concerts", "gig", "gigs", "show", "shows", "live show",
    "theatre", "theater", "play", "plays", "musical", "ballet", "opera",
    "drama",
    "festival", "fest", "comic con", "lit fest", "music festival",
    "comedy", "comedy show", "standup", "stand up", "stand-up", "improv",
    "open mic",
    "gaming", "game", "games", "xbox", "playstation", "ps5", "ps4",
    "steam", "nintendo", "switch", "epic games", "rockstar games",
    "valorant", "fortnite", "minecraft", "pubg", "bgmi", "free fire",
    "league of legends", "lol", "dota", "cs go", "counter strike",
    "amusement", "theme park", "water park", "snow park", "wonderla",
    "essel world", "imagica", "adventure park", "trampoline park",
    "trampoline",
    "zoo", "aquarium", "planetarium", "museum", "art gallery",
    "exhibition", "expo", "fair",
    "club night", "nightclub", "pub crawl", "karaoke", "bowling",
    "go karting", "go-karting", "paintball", "laser tag", "escape room",
    "ipl", "ipl ticket", "world cup", "match ticket", "stadium", "fan park",
    "magic show",
  ],

  Bill: [
    "electricity", "electricity bill", "current bill", "power bill",
    "bescom", "tneb", "bses", "tata power", "adani electricity", "mseb",
    "water bill", "water tax", "bwssb",
    "gas bill", "gas cylinder", "lpg", "indane", "hp gas", "bharat gas",
    "internet bill", "wifi", "wifi bill", "broadband", "fibernet", "fiber",
    "act fibernet", "airtel xstream", "jio fiber", "hathway", "tikona",
    "phone bill", "mobile bill", "postpaid", "recharge", "prepaid",
    "airtel recharge", "jio recharge", "vi recharge", "bsnl",
    "dth", "tata sky", "tata play", "airtel digital tv", "sun direct",
    "dish tv", "den networks",
    "cable", "cable tv",
    "society maintenance", "society fee", "society", "maintenance", "rwa",
    "apartment fee", "property tax", "house tax", "municipal tax",
    "council tax",
    // insurance / loans / cards / tax
    "insurance", "insurance premium", "policy premium", "premium payment",
    "lic", "lic premium", "hdfc life", "icici prudential", "max life",
    "sbi life", "tata aig", "bajaj allianz", "star health", "niva bupa",
    "religare", "health insurance", "life insurance", "car insurance",
    "bike insurance", "term insurance",
    "loan", "loan emi", "emi", "home loan", "personal loan", "car loan",
    "bike loan", "education loan", "loan repayment",
    "credit card bill", "card bill", "cc bill", "credit card payment",
    "tax", "income tax", "tds", "advance tax", "gst payment", "gst",
  ],

  Subscriptions: [
    "subscription", "subscriptions", "membership", "annual plan",
    "monthly plan", "auto renew", "auto-renew", "renewal", "renew",
    // streaming
    "netflix", "spotify", "spotify premium", "amazon prime", "prime video",
    "prime membership", "hotstar", "disney+", "disney plus",
    "youtube premium", "youtube music", "apple music", "apple tv",
    "tidal", "soundcloud", "deezer", "audible",
    "gaana", "gaana plus", "wynk", "jiosaavn", "jio saavn",
    "sony liv", "zee5", "voot", "alt balaji", "altbalaji", "mx player",
    "discovery+", "lionsgate play", "lionsgate",
    // cloud / productivity
    "icloud", "google one", "google drive storage", "dropbox",
    "onedrive", "box.com",
    "github", "github copilot", "gitlab", "bitbucket", "vercel pro",
    "notion", "notion ai", "linkedin premium", "linkedin learning",
    "chatgpt", "chatgpt plus", "openai", "claude", "anthropic",
    "midjourney", "perplexity", "grammarly", "duolingo plus", "babbel",
    "canva", "canva pro", "adobe", "creative cloud", "photoshop",
    "lightroom", "figma", "framer", "framer pro",
    "microsoft 365", "office 365", "google workspace", "g suite",
    "slack", "zoom pro", "loom", "miro", "trello",
    // misc subs
    "headspace", "calm app", "tinder plus", "tinder gold", "bumble premium",
    "hinge premium", "strava", "strava premium",
  ],

  Health: [
    "doctor", "doctors", "physician", "specialist", "consultant",
    "appointment", "doctor appointment", "consultation", "consultation fee",
    "hospital", "hospitals", "hospital bill", "clinic", "polyclinic",
    "nursing home", "icu",
    "apollo", "fortis", "manipal", "narayana", "max hospital",
    "aiims", "medanta", "kims", "cmc", "lilavati", "kokilaben", "wockhardt",
    "medical", "medicine", "medicines", "tablets", "syrup", "prescription",
    "antibiotic", "antibiotics", "painkiller", "paracetamol", "crocin",
    "dolo", "azithromycin", "ointment", "bandage", "first aid",
    "pharma", "pharmacy", "chemist", "drug store",
    "1mg", "tata 1mg", "netmeds", "pharmeasy", "medplus", "apollo pharmacy",
    "wellness forever",
    "lab test", "lab tests", "blood test", "blood tests", "diagnostic",
    "diagnostics", "thyrocare", "lal pathlabs", "metropolis", "dr lal",
    "ecg", "bp check", "blood pressure", "sugar test", "diabetes test",
    "checkup", "health checkup", "preventive checkup",
    "physiotherapy", "physio", "physiotherapist",
    "ayurveda", "ayurvedic", "homeopathy", "homeopathic", "naturopathy",
    "dental", "dentist", "rct", "root canal", "braces", "filling",
    "x-ray", "xray", "mri", "ct scan", "ultrasound", "sonography", "scan",
    "surgery", "operation", "ambulance",
    "vaccine", "vaccination", "booster shot", "immunization",
    "eye doctor", "ophthalmologist", "optical", "glasses",
    "spectacles", "contact lens", "lens", "lenses", "hearing aid",
    // specialists
    "cardiologist", "neurologist", "pediatrician", "paediatrician",
    "gynecologist", "gynaecologist", "orthopedic", "orthopaedic",
    "dermatologist", "ent", "psychiatrist", "psychologist", "therapist",
    "therapy", "counseling", "counselling",
    "diet", "dietitian", "nutritionist",
    // fitness
    "gym", "gym membership", "gym fees", "fitness", "workout", "trainer",
    "personal trainer", "yoga", "yoga class", "pilates", "zumba",
    "crossfit", "dance class", "aerobics", "kickboxing",
    "supplements", "vitamins", "multivitamin", "protein", "whey", "creatine",
    "bcaa", "omega 3",
    // grooming
    "salon", "spa", "massage", "manicure", "pedicure", "facial",
    "barber", "parlour", "parlor", "threading", "waxing",
    "haircut", "hair cut", "hair color", "hair colour", "hair spa",
    "beauty parlour",
    // pets
    "vet", "vet visit", "veterinary", "pet clinic", "deworming",
    "pet vaccination", "pet grooming",
  ],

  Education: [
    "tuition", "tutor", "tutoring", "coaching", "coaching class",
    "coaching classes", "class", "classes", "lecture", "lectures",
    "lesson", "lessons",
    "school", "school fees", "school fee",
    "college", "college fees", "college fee", "university", "campus",
    "exam", "exam fee", "exam fees", "entrance exam", "entrance",
    "jee", "neet", "gate", "cat exam", "upsc", "ssc", "rrb",
    "ielts", "toefl", "gre", "gmat", "duolingo english test", "ielts coaching",
    "textbook", "textbooks", "books for school", "study material",
    "guide book",
    "stationery", "notebook", "notebooks", "pen", "pens", "pencil",
    "pencils", "eraser", "ruler", "geometry box", "compass",
    "calculator", "scientific calculator", "highlighter",
    "udemy", "coursera", "edx", "khan academy", "byjus", "byju's",
    "unacademy", "vedantu", "physics wallah", "pw", "white hat junior",
    "cuemath", "extramarks",
    "masterclass", "skillshare", "pluralsight", "datacamp",
    "training", "workshop", "certification", "certificate", "bootcamp",
    "online course", "online class", "course fee", "diploma", "degree",
    "skill", "skill development", "upskilling", "learning",
    "hostel fee", "hostel", "library", "lab fee",
    "project", "assignment", "thesis", "research paper", "dissertation",
  ],

  Gifts: [
    "gift", "gifts", "gifting", "present", "presents",
    "birthday", "birthday gift", "anniversary", "anniversary gift",
    "wedding gift", "wedding", "engagement gift", "baby shower", "kids gift",
    "flowers", "bouquet", "rakhi", "raksha bandhan",
    "diwali sweets", "diwali gift", "holi", "diwali", "christmas",
    "christmas gift", "new year gift", "valentine", "valentine's",
    "valentines gift", "mother's day", "father's day", "mothers day",
    "fathers day",
    "eid", "easter", "thanksgiving",
    "card", "greeting card", "chocolate box", "chocolates", "hamper",
    "gift hamper", "gift card", "voucher",
    "friendship band", "souvenir", "memento",
  ],

  Household: [
    "rent", "house rent", "apartment rent", "flat rent", "pg rent",
    "lease", "lease deposit", "security deposit", "deposit", "advance",
    "broker", "brokerage", "broker fee",
    "maid", "house help", "cook", "cleaner", "domestic help",
    "nanny", "babysitter", "house keeping", "housekeeping",
    "electrician", "plumber", "carpenter", "painter", "mason",
    "handyman", "pest control", "fumigation",
    "paint", "painting", "repair", "repairs", "renovation", "remodeling",
    "interior", "interior design", "interior designer",
    "amc", "service contract", "annual maintenance",
    "wifi installation", "set up", "setup",
    "furniture", "sofa", "couch", "bed", "mattress", "wardrobe",
    "dining table", "chair", "chairs", "table", "tables", "bookshelf",
    "shoe rack", "shelf", "shelves",
    "appliance", "appliances", "fridge", "refrigerator",
    "washing machine", "ac", "air conditioner", "ac repair", "ac service",
    "water purifier", "ro", "microwave", "oven", "induction",
    "geyser", "water heater", "chimney", "exhaust fan",
    "kitchen", "utensil", "utensils", "cookware", "tawa", "kadhai",
    "pressure cooker", "cooker", "pan", "pans",
    "plates", "bowls", "mugs", "cutlery", "spoons", "knives",
    "broom", "mop", "vacuum cleaner", "detergent", "harpic",
    "dishwash", "dish soap", "vim", "lizol", "phenyl", "colin",
    "cleaning supplies", "garbage bags", "trash bags", "duster",
    "towels", "bedsheet", "bedsheets", "pillow", "pillows", "pillow cover",
    "blanket", "comforter", "quilt", "duvet", "curtain", "curtains",
    "carpet", "rug", "doormat",
    "lamp", "light bulb", "bulbs", "tubelight", "led", "led light",
    "decoration", "decor", "wall paint", "wallpaper", "wall art",
    "plant", "plants", "pot", "pots", "gardening", "manure",
    "soil", "seeds", "fertilizer",
  ],

  Social: [
    "party", "parties", "gathering", "meetup", "get together",
    "get-together", "hangout", "hang out", "hangouts",
    "reunion", "celebration", "potluck",
    "house warming", "housewarming", "bachelor party", "bachelorette",
    "hen night", "friends night", "ladies night", "boys night", "guys night",
    "game night", "movie night", "stag party", "farewell", "send off",
    "freshers", "freshers party", "alumni meet",
  ],

  Utilities: [
    "utility", "utilities",
  ],

  // ---------- Shopping ----------
  Shopping: [
    // clothing
    "clothes", "clothing", "apparel", "wear", "outfit", "outfits",
    "garment", "garments",
    "shirt", "shirts", "tshirt", "t-shirt", "t shirt", "tee", "tees",
    "polo", "polos",
    "pant", "pants", "trouser", "trousers", "jean", "jeans", "denim",
    "shorts", "skirt", "skirts", "dress", "dresses", "gown", "frock",
    "kurta", "kurti", "kurtas", "kurtis", "saree", "sari", "sarees",
    "lehenga", "salwar", "salwar kameez", "sherwani", "suit", "blazer",
    "tuxedo", "blouse", "tank top", "crop top",
    "shoe", "shoes", "sneaker", "sneakers", "trainers", "sandal",
    "sandals", "slippers", "flipflops", "flip-flops", "flip flops",
    "boots", "loafers", "heels", "stilettos", "footwear",
    "jacket", "jackets", "coat", "overcoat", "raincoat", "windcheater",
    "sweater", "sweaters", "hoodie", "hoodies", "sweatshirt", "cardigan",
    "tracksuit", "joggers", "leggings", "jeggings",
    "scarf", "muffler", "shawl", "hat", "cap", "caps", "beanie",
    "gloves", "mittens", "socks", "stockings", "tights",
    "underwear", "lingerie", "bra", "panties", "boxer", "boxers",
    "briefs", "vest", "thermals", "innerwear",
    "tie", "bow tie", "belt", "belts", "suspenders",
    "watch", "watches", "wristwatch", "sunglasses", "shades",
    "spectacle frame", "frames",
    "bag", "bags", "handbag", "handbags", "tote", "sling", "clutch",
    "purse", "wallet", "wallets", "backpack", "backpacks", "duffel",
    "duffel bag", "luggage bag", "trolley bag", "trolley", "suitcase",
    // jewelry / accessories
    "jewelry", "jewellery", "ring", "rings", "earring", "earrings",
    "necklace", "bracelet", "bracelets", "anklet", "bangle", "bangles",
    "pendant", "chain", "locket", "stud", "studs", "nose pin",
    "nose ring", "mangalsutra", "fashion", "accessories", "accessory",
    // electronics & gadgets
    "phone", "smartphone", "mobile phone", "cellphone", "cell phone",
    "iphone", "android phone", "samsung", "oneplus", "one plus",
    "xiaomi", "redmi", "mi phone", "oppo", "vivo", "realme", "motorola",
    "nothing phone", "google pixel", "pixel phone",
    "phone case", "phone cover", "screen protector", "tempered glass",
    "laptop", "macbook", "macbook pro", "macbook air", "thinkpad",
    "dell laptop", "hp laptop", "lenovo", "asus laptop", "acer",
    "computer", "pc", "desktop", "laptop bag", "laptop stand",
    "tablet", "ipad", "ipad air", "ipad pro", "ipad mini", "kindle",
    "headphone", "headphones", "earbuds", "earphone", "earphones",
    "airpods", "airpod", "buds", "boat", "boult", "noise headphones",
    "jbl", "sony headphones", "bose",
    "charger", "fast charger", "cable", "usb cable", "type c",
    "type-c", "lightning cable", "adapter", "power adapter",
    "mouse", "wireless mouse", "keyboard", "mechanical keyboard",
    "monitor", "ultrawide", "webcam",
    "camera", "dslr", "mirrorless", "gopro", "polaroid",
    "speaker", "bluetooth speaker", "soundbar", "home theatre",
    "home theater",
    "smartwatch", "smart watch", "apple watch", "garmin", "fitbit",
    "fitness tracker", "fitness band", "smart band",
    "drone", "console", "controller", "joystick", "gaming chair",
    "gaming desk",
    "tv", "television", "led tv", "oled", "qled", "smart tv",
    "router", "wifi router", "modem", "extender", "mesh router",
    "powerbank", "power bank", "ups", "stabilizer", "inverter",
    "printer", "scanner", "ink", "ink cartridge", "toner",
    // personal care
    "makeup", "cosmetics", "lipstick", "lip balm", "lip gloss",
    "perfume", "cologne", "deodorant", "deo", "antiperspirant",
    "shampoo", "conditioner", "soap", "body wash", "shower gel",
    "lotion", "body lotion", "cream", "face cream", "moisturizer",
    "serum", "face wash", "facewash", "scrub", "toner",
    "mascara", "foundation", "concealer", "primer", "eyeliner", "kajal",
    "blush", "highlighter", "powder", "compact",
    "sunscreen", "spf",
    "hair oil", "hair gel", "hair wax", "hair spray", "hair serum",
    "toothpaste", "toothbrush", "mouthwash", "floss",
    "razor", "razors", "shaving cream", "aftershave", "beard oil",
    "beard trimmer", "trimmer", "hair dryer", "straightener",
    "nail polish", "nail paint", "nail file", "tweezers",
    // makeup brands
    "lakme", "loreal", "l'oreal", "maybelline", "mac cosmetics",
    "sephora", "ponds", "nivea", "dove", "garnier", "biotique",
    "mamaearth", "the body shop", "forest essentials",
    "minimalist", "wow", "neutrogena", "cetaphil",
    // sports & fitness
    "cricket bat", "cricket ball", "football", "basketball",
    "tennis racket", "badminton racket", "shuttle", "shuttlecock",
    "yoga mat", "dumbbell", "dumbbells", "kettlebell",
    "resistance band", "skipping rope", "cycle", "bicycle",
    // online shopping platforms
    "amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho",
    "snapdeal", "tata cliq", "tatacliq", "nykaa fashion",
    "fabindia", "westside", "max fashion", "lifestyle store",
    "shoppers stop", "pantaloons", "biba", "ritu kumar",
    "zara", "h&m", "h and m", "uniqlo", "marks and spencer",
    "louis philippe", "van heusen", "allen solly", "peter england",
    "raymond", "manyavar",
    "levis", "wrangler", "puma", "nike", "adidas", "reebok",
    "decathlon", "skechers", "crocs", "vans", "asics", "new balance",
    "fila", "under armour",
    "croma", "reliance digital", "vijay sales", "poorvika",
    "lenskart", "titan", "fastrack", "fossil", "casio",
    "tanishq", "kalyan jewellers", "malabar", "pc jeweller",
    // home shopping items
    "toy", "toys", "lego", "barbie", "hot wheels", "remote control car",
    "soft toy", "soft toys", "puzzle", "board game", "board games",
    "novel", "novels", "magazine", "magazines",
    // misc generic
    "shopping", "mall", "store", "outlet", "showroom",
    "gadget", "gadgets", "accessory", "accessories",
  ],
};

// Pre-compile a flat list sorted by length so multi-word phrases match
// before their shorter components ("ice cream" beats "ice").
const COMPILED = Object.entries(KEYWORDS)
  .flatMap(([category, words]) => words.map((w) => ({ category, w })))
  .sort((a, b) => b.w.length - a.w.length);

export const inferCategory = (text) => {
  if (!text || typeof text !== "string") return null;
  const lower = text.toLowerCase();
  // Split on anything that isn't a letter/digit, so token-based matching
  // ignores punctuation but treats compound words like "facebook" as a
  // single token (so "book" inside it won't false-match).
  const tokens = lower.split(/[^a-z0-9]+/i).filter(Boolean);
  const tokenSet = new Set(tokens);

  const scores = {};
  for (const { category, w } of COMPILED) {
    let matched = false;
    if (w.includes(" ") || w.includes("-")) {
      // Multi-word phrase: keep doing substring match on the raw text.
      if (lower.includes(w)) matched = true;
    } else {
      // Single word: only match on full word boundaries.
      if (tokenSet.has(w)) matched = true;
    }
    if (matched) {
      // Weight by length so longer / more specific keywords win ties.
      scores[category] = (scores[category] || 0) + w.length;
    }
  }

  const top = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
  return top ? top[0] : null;
};

export const CATEGORY_EMOJI = {
  Household: "🏠",
  Travel: "✈️",
  Entertainment: "🎬",
  Groceries: "🛒",
  Dining: "🍽️",
  Shopping: "🛍️",
  Gifts: "🎁",
  Utilities: "💡",
  Social: "🎉",
  Bill: "🧾",
  Subscriptions: "📺",
  Education: "📚",
  Health: "💊",
  Others: "✨",
};

export const ALL_CATEGORIES = [
  "Dining",
  "Groceries",
  "Travel",
  "Shopping",
  "Entertainment",
  "Bill",
  "Subscriptions",
  "Household",
  "Health",
  "Education",
  "Gifts",
  "Social",
  "Utilities",
  "Others",
];
