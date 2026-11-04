#!/usr/bin/env python3
"""Capitalization audit for soul (English) and soul-it (Italian).

Run through check-caps.sh. Hard errors (exit 1):
  1. divine names written lowercase (god, lord, jesus, christ, holy spirit / dio, gesù, cristo, spirito santo) or "LORD"
  2. people/place names written lowercase (fixed list below)
  3. a citation of another entry whose title differs from that entry's own title only in letter case
Then, without failing, it lists the lines to check by hand: lowercase pronouns
(he/his/you/me... / suo/tuo/te/lui...) in the title and verse lines of files
changed since the last commit, because who a pronoun refers to can't be checked
automatically.
"""
import glob
import os
import re
import subprocess
import sys

SOUL = os.path.dirname(os.path.abspath(__file__))
SOULIT = os.path.join(os.path.dirname(SOUL), 'soul-it')
CONTENT = ['bible', 'prayers', 'commonplace', 'saints', 'what-is-it', 'guides']

DIVINE = {
    'en': [r'god', r'lord', r'jesus', r'christ', r'holy spirit', r'messiah'],
    'it': [r'dio', r'gesù', r'cristo', r'spirito santo', r'messia'],
}
# lowercase uses that are correct
DIVINE_OK = {
    'en': [r'lord it over', r'other god\b', r'\bgods\b', r'\ba god\b', r'no god\b', r'any god\b', r'this god\b'],
    'it': [r'\bdèi\b', r'altr[oi] d[iè]+o?\b', r'un dio\b', r'nessun dio\b'],
}
NAMES = ['peter', 'paul', 'moses', 'abraham', 'isaac', 'jacob', 'david', 'elijah', 'elisha', 'isaiah',
         'jeremiah', 'mary', 'joseph', 'judas', 'pilate', 'satan', 'israel', 'jerusalem', 'egypt',
         'pharisees', 'nazareth', 'galilee', 'bethlehem',
         'pietro', 'paolo', 'mosè', 'abramo', 'isacco', 'giacobbe', 'davide', 'elia', 'eliseo', 'isaia',
         'geremia', 'maria', 'giuseppe', 'giuda', 'pilato', 'satana', 'israele', 'gerusalemme', 'egitto',
         'nazaret', 'galilea', 'betlemme']
PRONOUNS = {
    'en': r"\b(he|him|his|himself|you|your|yours|yourself|me|my|mine|myself)\b",
    'it': r"\b(lui|egli|suo|sua|suoi|sue|tu|te|tuo|tua|tuoi|tue|mio|mia|miei|mie|me)\b",
}


def strip(line):
    """Drop what the rule doesn't govern: URLs, slugs, anchors, HTML attributes, source names."""
    if re.match(r'^~ ↳ (source|fonte):', line):
        return ''
    line = re.sub(r'\]\([^)]*\)', ']', line)
    line = re.sub(r'(href|id|src|class)="[^"]*"', '', line)
    line = re.sub(r'https?://\S+', '', line)
    line = re.sub(r'\b[\w-]+/[\w./?=#-]+', '', line)
    return line


def files(repo):
    out = []
    for d in CONTENT:
        out += glob.glob(f'{repo}/{d}/*.txt') + glob.glob(f'{repo}/{d}/*.html')
    out += glob.glob(f'{repo}/*.html')
    return sorted(out)


def title_of(path):
    with open(path) as fh:
        first = fh.readline().strip()
    if path.endswith('.html'):
        m = re.search(r'<title>(.*?)</title>', open(path).read())
        return m.group(1).strip() if m else None
    d = os.path.basename(os.path.dirname(path))
    if d in ('bible', 'prayers') and ' | ' in first:
        return first.split(' | ', 1)[1].strip()
    return first


def changed(repo):
    r = subprocess.run(['git', '-C', repo, 'status', '--porcelain'], capture_output=True, text=True)
    return {os.path.join(repo, l[3:].strip()) for l in r.stdout.splitlines() if l.strip()}


def audit(repo, lang):
    errors, review = [], []
    titles = {}
    for f in files(repo):
        if os.path.dirname(f) != repo:
            t = title_of(f)
            if t and len(t) >= 8:
                titles[os.path.relpath(f, repo)] = t
    div = re.compile(r'\b(' + '|'.join(DIVINE[lang]) + r')\b')
    ok = re.compile('|'.join(DIVINE_OK[lang]))
    names = re.compile(r'\b(' + '|'.join(NAMES) + r")\b(?!['’]?[-_/.]\w)")
    pron = re.compile(PRONOUNS[lang])
    touched = changed(repo)
    for f in files(repo):
        rel = os.path.relpath(f, repo)
        for n, raw in enumerate(open(f).read().split('\n'), 1):
            # 3. citation case mismatch (checked on the raw line, links included)
            for p in set(re.findall(r'post\.html\?p=([^)"#\s]+)', raw)):
                t = titles.get(p)
                if t:
                    for m in re.finditer(re.escape(t), raw, re.I):
                        if m.group(0) != t and not m.group(0).isupper():  # all-caps form (I AM WHO I AM) is deliberate
                            errors.append(f'{rel}:{n}  citation "{m.group(0)}" -> title is "{t}"')
            line = strip(raw)
            low = ok.sub('', line)
            for m in div.finditer(low):
                errors.append(f'{rel}:{n}  "{m.group(0)}" lowercase')
            if lang == 'en' and re.search(r'\bLORD\b', line):
                errors.append(f'{rel}:{n}  "LORD" -> "Lord"')
            for m in names.finditer(line):
                errors.append(f'{rel}:{n}  name "{m.group(0)}" lowercase')
            for m in re.finditer(r'(?<![\w/=_-])(psalms?|salm[oi]) \d', line):
                errors.append(f'{rel}:{n}  book name "{m.group(0)}" lowercase')
            # pronouns: only title + verse lines of files changed since the last commit
            if f in touched and (n == 1 or raw.startswith('[') or raw.startswith('!![')):
                for m in pron.finditer(line):
                    review.append(f'{rel}:{n}  "{m.group(0)}": {raw.strip()[:110]}')
    return errors, review


def main():
    fail = 0
    for repo, lang in ((SOUL, 'en'), (SOULIT, 'it')):
        if not os.path.isdir(repo):
            print(f'ERROR: {repo} not found')
            return 1
        errors, review = audit(repo, lang)
        name = os.path.basename(repo)
        print(f'== {name}: {len(errors)} error(s)')
        for e in errors:
            print('  ' + e)
        if review:
            print(f'-- {name}: pronouns to check by hand (God/Jesus/saint -> capital)')
            for r in review:
                print('  ' + r)
        fail |= bool(errors)
    print('\nFAIL: fix the errors above before committing.' if fail else '\nOK: no capitalization errors found.')
    return 1 if fail else 0


if __name__ == '__main__':
    sys.exit(main())
