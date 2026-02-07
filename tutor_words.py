# tutor_words.py

# ... (Keep letter_words and combination_words as they were) ...

letter_words = {
    "a": ["ask", "all", "are", "add", "act"],
    "b": ["bib", "bob", "bag", "bat", "bed"],
    "c": ["cat", "can", "cut", "cup", "car"],
    "d": ["dad", "did", "dog", "dig", "dot"],
    "e": ["egg", "eye", "ear", "eat", "end"],
    "f": ["fat", "fan", "fit", "fun", "for"],
    "g": ["gag", "get", "got", "gum", "gas"],
    "h": ["hat", "had", "has", "hit", "hot"],
    "i": ["ice", "ill", "ink", "it", "in"],
    "j": ["jam", "jet", "job", "jog", "jar"],
    "k": ["kid", "kit", "key", "kin", "keg"],
    "l": ["lab", "lad", "let", "lip", "log"],
    "m": ["mom", "mad", "man", "map", "mat"],
    "n": ["net", "nut", "not", "new", "now"],
    "o": ["old", "off", "owl", "oil", "out"],
    "p": ["pan", "pet", "pig", "pot", "put"],
    "q": ["qua", "qui", "quo", "qat", "que"],
    "r": ["rat", "red", "run", "rug", "rag"],
    "s": ["sad", "sat", "sit", "sun", "set"],
    "t": ["tag", "ten", "tip", "top", "tub"],
    "u": ["up", "us", "use", "urn", "ugh"],
    "v": ["van", "vet", "vat", "vim", "vie"],
    "w": ["wag", "web", "wet", "wig", "win"],
    "x": ["axe", "box", "fix", "mix", "six"],
    "y": ["yak", "yam", "yes", "yet", "you"],
    "z": ["zap", "zig", "zag", "zip", "zoo"]
}

combination_words = {
    "th": ["the", "that", "this", "then", "with", "both"],
    "he": ["he", "she", "the", "her", "here", "help"],
    "in": ["in", "bin", "pin", "tin", "win", "chin"],
    "er": ["her", "per", "red", "era", "err", "over"],
    "an": ["an", "ant", "and", "can", "fan", "man"],
    "re": ["red", "are", "pre", "ire", "ore", "rest"],
    "on": ["on", "one", "son", "won", "ton", "bond"],
    "at": ["at", "bat", "cat", "fat", "hat", "mat"],
    "en": ["pen", "men", "ten", "hen", "den", "end"],
    "nd": ["and", "end", "sand", "band", "hand", "land"],
    "fi": ["fish", "fit", "fig", "find", "five", "first"] # Added specific request
}

beginner_curriculum = [
    {"name": "Module 1: Home Row (Left)", "chars": "asdf", "words": ["sad", "dad", "fad", "add", "as", "fa", "da"]},
    {"name": "Module 2: Home Row (Right)", "chars": "jkl;", "words": ["all", "fall", "lad", "lass", "ask", "flask"]},
    {"name": "Module 3: Home Row (Full)", "chars": "asdfjkl;", "words": ["salad", "flask", "alfalfa", "salk", "dads"]},
    {"name": "Module 4: Top Row (Left)", "chars": "qwert", "words": ["tree", "were", "wet", "rat", "tar", "raw"]},
    {"name": "Module 5: Top Row (Right)", "chars": "yuiop", "words": ["you", "up", "top", "pot", "toy", "put"]},
    {"name": "Module 6: Top Row (Full)", "chars": "qwertyuiop", "words": ["quiet", "power", "route", "twitter", "write"]},
    {"name": "Module 7: Bottom Row (Left)", "chars": "zxcv", "words": ["cab", "vac", "zest", "axe", "cave"]},
    {"name": "Module 8: Bottom Row (Right)", "chars": "bnm", "words": ["man", "ban", "nab", "bam", "mom"]},
    {"name": "Module 9: Bottom Row (Full)", "chars": "zxcvbnm", "words": ["zombie", "vixen", "caveman", "banjo"]},
    {"name": "Module 10: Full Alphabet", "chars": "abcdefghijklmnopqrstuvwxyz", "words": ["pack", "my", "box", "with", "five", "dozen", "liquor", "jugs"]}
]

# A larger list for the AI to 'mine' words from for any combination
master_word_list = [
    "about", "above", "across", "act", "active", "activity", "add", "afraid", "after", "again", "age", "ago", "agree", "air", "all", "alone", "along", "already", "always", "am", "amount", "an", "and", "angry", "another", "answer", "any", "anyone", "anything", "anytime", "appear", "apple", "are", "area", "arm", "army", "around", "arrive", "art", "as", "ask", "at", "attack", "aunt", "autumn", "away",
    "baby", "base", "back", "bad", "bag", "ball", "bank", "basket", "bath", "be", "bean", "bear", "beautiful", "bed", "bedroom", "beer", "behave", "before", "begin", "behind", "bell", "below", "beside", "best", "better", "between", "big", "bird", "birth", "birthday", "bit", "bite", "black", "bleed", "block", "blood", "blow", "blue", "board", "boat", "body", "boil", "bone", "book", "border", "born", "borrow", "both", "bottle", "bottom", "bowl", "box", "boy", "branch", "brave", "bread", "break", "breakfast", "breathe", "bridge", "bright", "bring", "brother", "brown", "brush", "build", "burn", "bus", "busy", "but", "buy", "by",
    "cake", "call", "can", "candle", "cap", "car", "card", "care", "carry", "case", "cat", "catch", "chair", "chance", "change", "chase", "cheap", "cheese", "chicken", "child", "children", "chocolate", "choice", "choose", "circle", "city", "class", "clean", "clear", "climb", "clock", "cloth", "clothes", "cloud", "cloudy", "close", "coffee", "coat", "coin", "cold", "collect", "colour", "comb", "comfortable", "common", "compare", "come", "complete", "computer", "condition", "continue", "control", "cook", "cool", "copper", "corn", "corner", "correct", "cost", "contain", "count", "country", "course", "cover", "crash", "cross", "cry", "cup", "cupboard", "cut",
    "dance", "dangerous", "dark", "daughter", "day", "dead", "decide", "decrease", "deep", "deer", "depend", "desk", "destroy", "develop", "die", "different", "difficult", "dinner", "direction", "dirty", "discover", "dish", "do", "dog", "door", "double", "down", "draw", "dream", "dress", "drink", "drive", "drop", "dry", "duck", "dust", "duty",
    "each", "ear", "early", "earn", "earth", "east", "easy", "eat", "education", "effect", "egg", "eight", "either", "electric", "elephant", "else", "empty", "end", "enemy", "enjoy", "enough", "enter", "equal", "entrance", "escape", "even", "evening", "event", "ever", "every", "everyone", "exact", "everybody", "examination", "example", "except", "excited", "exercise", "expect", "expensive", "explain", "extremely", "eye",
    "face", "fact", "fail", "fall", "false", "family", "famous", "far", "farm", "father", "fast", "fat", "fault", "fear", "feed", "feel", "female", "fever", "few", "fight", "fill", "film", "find", "fine", "finger", "finish", "fire", "first", "fish", "fit", "five", "fix", "flag", "flat", "float", "floor", "flower", "fly", "fold", "food", "fool", "foot", "football", "for", "force", "foreign", "forest", "forget", "forgive", "fork", "form", "fox", "four", "free", "freedom", "freeze", "fresh", "friend", "friendly", "from", "front", "fruit", "full", "fun", "funny", "furniture", "further", "future",
    "game", "garden", "gate", "general", "gentleman", "get", "gift", "give", "glad", "glass", "go", "goat", "god", "gold", "good", "goodbye", "grandfather", "grandmother", "grass", "grave", "great", "green", "grey", "ground", "group", "grow", "gun",
    "hair", "half", "hall", "hammer", "hand", "happen", "happy", "hard", "hat", "hate", "have", "he", "head", "healthy", "hear", "heavy", "heart", "heaven", "height", "hello", "help", "hen", "her", "here", "hers", "hide", "high", "hill", "him", "his", "hit", "hobby", "hold", "hole", "holiday", "home", "hope", "horse", "hospital", "hot", "hotel", "house", "how", "hundred", "hungry", "hour", "hurry", "husband", "hurt",
    "ice", "idea", "if", "important", "increase", "inside", "into", "introduce", "invent", "iron", "invite", "is", "island", "it", "its",
    "jelly", "job", "join", "juice", "jump", "just",
    "keep", "key", "kill", "kind", "king", "kitchen", "knee", "knife", "knock", "know",
    "ladder", "lady", "lamp", "land", "large", "last", "late", "lately", "laugh", "lazy", "lead", "leaf", "learn", "leave", "leg", "left", "lend", "length", "less", "lesson", "let", "letter", "library", "lie", "life", "light", "like", "lion", "lip", "list", "listen", "little", "live", "lock", "lonely", "long", "look", "lose", "lot", "love", "low", "lower", "luck",
    "machine", "main", "make", "male", "man", "many", "map", "mark", "market", "marry", "matter", "may", "me", "meal", "mean", "measure", "meat", "medicine", "meet", "member", "mention", "method", "middle", "milk", "million", "mind", "minute", "miss", "mistake", "mix", "model", "modern", "moment", "money", "monkey", "month", "moon", "more", "morning", "most", "mother", "mountain", "mouth", "move", "much", "music", "must", "my",
    "name", "narrow", "nation", "nature", "near", "nearly", "neck", "need", "needle", "neighbour", "neither", "net", "never", "new", "news", "newspaper", "next", "nice", "night", "nine", "no", "noble", "noise", "none", "nor", "north", "nose", "not", "nothing", "notice", "now", "number",
    "obey", "object", "ocean", "of", "off", "offer", "office", "often", "oil", "old", "on", "one", "only", "open", "opposite", "or", "orange", "order", "other", "our", "out", "outside", "over", "own",
    "page", "pain", "paint", "pair", "pan", "paper", "parent", "park", "part", "partner", "party", "pass", "past", "path", "pay", "peace", "pen", "pencil", "people", "pepper", "per", "perfect", "period", "person", "petrol", "photograph", "piano", "pick", "picture", "piece", "pig", "pin", "pink", "place", "plane", "plant", "plastic", "plate", "play", "please", "pleased", "plenty", "pocket", "point", "poison", "police", "polite", "pool", "poor", "popular", "position", "possible", "potato", "pour", "power", "present", "press", "pretty", "prevent", "price", "prince", "prison", "private", "prize", "probably", "problem", "produce", "promise", "proper", "protect", "provide", "public", "pull", "punish", "pupil", "push", "put",
    "queen", "question", "quick", "quiet", "quite",
    "radio", "rain", "rainy", "raise", "reach", "read", "ready", "real", "really", "receive", "record", "red", "remember", "remind", "remove", "rent", "repair", "repeat", "reply", "report", "rest", "restaurant", "result", "return", "rice", "rich", "ride", "right", "ring", "rise", "road", "rob", "rock", "room", "round", "rubber", "rude", "rule", "ruler", "run", "rush",
    "sad", "safe", "sail", "salt", "same", "sand", "save", "say", "school", "science", "scissors", "search", "seat", "second", "see", "seem", "sell", "send", "sentence", "serve", "seven", "several", "sex", "shade", "shadow", "shake", "shape", "share", "sharp", "she", "sheep", "sheet", "shelf", "shine", "ship", "shirt", "shoe", "shoot", "shop", "short", "should", "shoulder", "shout", "show", "sick", "side", "signal", "silence", "silly", "silver", "similar", "simple", "single", "since", "sing", "sink", "sister", "sit", "six", "size", "skill", "skin", "skirt", "sky", "sleep", "slip", "slow", "small", "smell", "smile", "smoke", "snow", "so", "soap", "sock", "soft", "some", "someone", "something", "sometimes", "son", "soon", "sorry", "sound", "soup", "south", "space", "speak", "special", "speed", "spell", "spend", "spoon", "sport", "spread", "spring", "square", "stamp", "stand", "star", "start", "station", "stay", "steal", "steam", "step", "still", "stomach", "stone", "stop", "store", "storm", "story", "strange", "street", "strong", "structure", "student", "study", "stupid", "subject", "substance", "successful", "such", "sudden", "sugar", "suitable", "summer", "sun", "sunny", "support", "sure", "surprise", "sweet", "swim", "sword",
    "table", "take", "talk", "tall", "taste", "taxi", "tea", "teach", "team", "tear", "telephone", "television", "tell", "ten", "tennis", "terrible", "test", "than", "that", "the", "their", "then", "there", "therefore", "these", "thick", "thin", "thing", "think", "third", "this", "though", "threat", "three", "tidy", "tie", "title", "to", "today", "toe", "together", "tomorrow", "tonight", "too", "tool", "tooth", "top", "total", "touch", "town", "train", "tram", "travel", "tree", "trouble", "true", "trust", "twice", "try", "turn", "type",
    "ugly", "uncle", "under", "understand", "unit", "until", "up", "use", "useful", "usual", "usually",
    "vegetable", "very", "village", "voice", "visit",
    "wait", "wake", "walk", "want", "warm", "wash", "waste", "watch", "water", "way", "we", "weak", "wear", "weather", "wedding", "week", "weight", "welcome", "were", "well", "west", "wet", "what", "wheel", "when", "where", "which", "while", "white", "who", "why", "wide", "wife", "wild", "will", "win", "wind", "window", "wine", "winter", "wire", "wise", "wish", "with", "without", "woman", "wonder", "word", "work", "world", "worry", "yard", "yell", "yesterday", "yet", "you", "young", "your", "zero", "zoo"
]