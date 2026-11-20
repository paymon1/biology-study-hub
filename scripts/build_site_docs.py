"""Prepare a clean MkDocs content tree from the repository's source Markdown.

The repository remains the source of truth. This script copies selected source
folders into a temporary docs tree while preserving their relative paths.
"""
from pathlib import Path
from shutil import copy2, copytree, rmtree

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "site_docs"
SOURCE_DIRS = [
    "00-study-guides", "01-curriculum", "02-lesson-notes",
    "03-visual-learning", "04-practice-questions", "05-exam-archives",
    "06-flashcards", "07-revision", "08-advanced-topics",
    "09-study-plans", "10-curated-resources",
]


def ignore_generated_and_internal(_directory, names):
    return [name for name in names if name == "README.md" or name.endswith("_TEMPLATE.md")]


def main():
    if DEST.exists():
        rmtree(DEST)
    DEST.mkdir(parents=True)
    for folder in SOURCE_DIRS:
        source = ROOT / folder
        if source.exists():
            copytree(source, DEST / folder, ignore=ignore_generated_and_internal, dirs_exist_ok=True)
    assets = DEST / "assets" / "stylesheets"
    assets.mkdir(parents=True, exist_ok=True)
    copy2(ROOT / "website" / "extra.css", assets / "extra.css")
    scripts = DEST / "assets" / "javascripts"
    scripts.mkdir(parents=True, exist_ok=True)
    copy2(ROOT / "website" / "flashcards.js", scripts / "flashcards.js")
    copy2(ROOT / "website" / "study-tools.js", scripts / "study-tools.js")
    copy2(ROOT / "website" / "index.md", DEST / "index.md")
    copy2(ROOT / "website" / "about.md", DEST / "about.md")


if __name__ == "__main__":
    main()
