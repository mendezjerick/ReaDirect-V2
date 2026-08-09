import html.parser
import re

class MyHTMLParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.in_paragraph = False
        
    def handle_starttag(self, tag, attrs):
        if tag in ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr']:
            self.in_paragraph = True

    def handle_endtag(self, tag):
        if tag in ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr']:
            self.text.append('\n')

    def handle_data(self, data):
        if data.strip():
            self.text.append(data.strip() + " ")

parser = MyHTMLParser()
try:
    with open('c:/Users/balli/Desktop/ReaDirect-V2/docs/manuscript.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove style tags and their contents
    content = re.sub(r'<style.*?>.*?</style>', '', content, flags=re.DOTALL)
    parser.feed(content)
    
    final_text = "".join(parser.text)
    
    with open('c:/Users/balli/Desktop/ReaDirect-V2/docs/manuscript.txt', 'w', encoding='utf-8') as f:
        f.write(final_text)
    print("Extraction successful.")
except Exception as e:
    print(f"Error: {e}")
