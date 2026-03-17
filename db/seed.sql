-- Seed puzzle types
INSERT INTO puzzle_types (type_name) VALUES
  ('crossword'),
  ('wordsearch'),
  ('unjumble')
ON CONFLICT DO NOTHING;

-- Create a sample puzzle day (change date as needed)
INSERT INTO puzzles (puzzle_date) VALUES ('2026-10-01')
ON CONFLICT (puzzle_date) DO NOTHING;

-- Sample content for 2026-10-01
WITH p AS (
  SELECT id FROM puzzles WHERE puzzle_date = '2026-10-01'
), pt AS (
  SELECT id, type_name FROM puzzle_types
)
INSERT INTO puzzle_content (puzzle_id, puzzle_type_id, content)
SELECT p.id, pt.id, c.content::jsonb
FROM p
CROSS JOIN (
  VALUES
    ('crossword', '{
      "type":"crossword",
      "gridSize":12,
      "words":[
        {"number":1,"word":"PHISHING","row":0,"col":0,"direction":"across","clue":"Fraud emails that trick users into revealing sensitive information."},
        {"number":2,"word":"MALWARE","row":2,"col":1,"direction":"down","clue":"Malicious software."},
        {"number":3,"word":"BOTNET","row":4,"col":3,"direction":"across","clue":"Network of compromised computers."},
        {"number":4,"word":"FIREWALL","row":6,"col":0,"direction":"across","clue":"Network security barrier."},
        {"number":5,"word":"ENCRYPT","row":8,"col":5,"direction":"down","clue":"To encode data for confidentiality."}
      ]
    }'),
    ('wordsearch', '{
      "type":"wordsearch",
      "gridSize":10,
      "words":["CYBER","SECURITY","PUZZLE","PHISHING","MALWARE"],
      "grid":[
        ["C","Y","B","E","R","A","B","C","D","E"],
        ["A","S","E","C","U","R","I","T","Y","F"],
        ["P","U","Z","Z","L","E","G","H","I","J"],
        ["K","L","M","N","O","P","Q","R","S","T"],
        ["M","A","L","W","A","R","E","X","Y","Z"],
        ["E","F","G","H","I","J","K","L","M","N"],
        ["O","P","Q","R","S","T","U","V","W","X"],
        ["Y","Z","A","B","C","D","E","F","G","H"],
        ["I","J","K","L","M","N","O","P","Q","R"],
        ["S","T","U","V","W","X","Y","Z","A","B"]
      ]
    }'),
    ('unjumble', '{
      "type":"unjumble",
      "questions":[
        {"scrambled":"SOMANWERAR","answer":"RANSOMWARE","clue":"Encrypts files for payment"},
        {"scrambled":"NIHPISGH","answer":"PHISHING","clue":"Fraudulent email attack"},
        {"scrambled":"LFRWLAIE","answer":"FIREWALL","clue":"Network security barrier"},
        {"scrambled":"RLWAEMA","answer":"MALWARE","clue":"Malicious software"},
        {"scrambled":"TTNOBE","answer":"BOTNET","clue":"Network of compromised computers"}
      ]
    }')
  ) AS c(type_name, content)
CROSS JOIN pt
WHERE pt.type_name = c.type_name
ON CONFLICT DO NOTHING;
-- Ensure admin role example user (optional)
INSERT INTO users (name,email,region,language,role)
VALUES ('Admin','admin@cyberwordament.com','Global','en','admin')
ON CONFLICT DO NOTHING;
