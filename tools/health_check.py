import urllib.request
import sys

def fetch(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent":"health-check/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            status = r.getcode()
            body = r.read(4096).decode('utf-8', errors='replace')
            print(f"URL: {url}\nStatus: {status}\nBody snippet:\n{body[:800]}\n---\n")
    except Exception as e:
        print(f"URL: {url}\nERROR: {e}\n---\n")

if __name__ == '__main__':
    urls = [
        'https://beauty-studio-backend.onrender.com/api/analytics/summary',
        'https://beauty-studio-backend.onrender.com/api/slots/24.03.2026?master=all',
        'https://beauty-studio-mini-app.vercel.app/',
    ]
    for u in urls:
        fetch(u)
