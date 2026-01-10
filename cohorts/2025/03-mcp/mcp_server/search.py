import os
import zipfile
import urllib.request
from pathlib import Path
import minsearch

# Configuration
ZIP_URL = "https://github.com/jlowin/fastmcp/archive/refs/heads/main.zip"
ZIP_FILE = "fastmcp-main.zip"
EXTRACT_DIR = "fastmcp_docs"


def download_if_needed():
    """Download the FastMCP zip file if it doesn't exist."""
    if os.path.exists(ZIP_FILE):
        print(f"✓ {ZIP_FILE} already exists, skipping download")
        return

    print(f"Downloading {ZIP_URL}...")
    urllib.request.urlretrieve(ZIP_URL, ZIP_FILE)
    print(f"✓ Downloaded to {ZIP_FILE}")


def extract_md_files():
    """Extract and process md/mdx files from the zip."""
    documents = []

    with zipfile.ZipFile(ZIP_FILE, "r") as zip_ref:
        # Get all files in the zip
        all_files = zip_ref.namelist()

        # Filter for .md and .mdx files
        md_files = [f for f in all_files if f.endswith((".md", ".mdx"))]

        print(f"Found {len(md_files)} markdown files")

        for file_path in md_files:
            # Read the content
            with zip_ref.open(file_path) as f:
                content = f.read().decode("utf-8")

            # Remove the first part of the path (e.g., "fastmcp-main/")
            # Split by '/' and rejoin from the second part onwards
            parts = file_path.split("/")
            if len(parts) > 1:
                normalized_path = "/".join(parts[1:])
            else:
                normalized_path = file_path

            # Skip if it's just a directory or empty
            if not normalized_path or normalized_path.endswith("/"):
                continue

            documents.append({"filename": normalized_path, "content": content})
            print(f"  ✓ Processed: {normalized_path}")

    return documents


def create_index(documents):
    """Create a minsearch index from the documents."""
    # Initialize minsearch index
    index = minsearch.Index(text_fields=["content", "filename"], keyword_fields=[])

    # Fit the index with documents
    index.fit(documents)
    print(f"\n✓ Indexed {len(documents)} documents")

    return index


def search(index, query, top_n=5):
    """Search the index and return top N results."""
    results = index.search(
        query=query,
        filter_dict={},
        boost_dict={"content": 1.0, "filename": 0.5},
        num_results=top_n,
    )
    return results


def main():
    """Main function to set up the search system."""
    print("=" * 60)
    print("FastMCP Documentation Search System")
    print("=" * 60)

    # Step 1: Download if needed
    download_if_needed()

    # Step 2: Extract and process md/mdx files
    print("\nExtracting markdown files...")
    documents = extract_md_files()

    # Step 3: Create index
    print("\nCreating search index...")
    index = create_index(documents)

    # Step 4: Test search with "demo" query
    print("\n" + "=" * 60)
    print("Testing search functionality")
    print("=" * 60)

    query = "demo"
    print(f"\nQuery: '{query}'")
    print("-" * 60)
    results = search(index, query, top_n=5)

    for i, result in enumerate(results, 1):
        print(f"{i}. {result['filename']}")
        # Show first 100 chars of content
        preview = result["content"][:100].replace("\n", " ")
        print(f"   Preview: {preview}...")
        print()

    print("\n" + "=" * 60)
    print(f"ANSWER: The first file returned for query 'demo' is:")
    print(f"  {results[0]['filename']}")
    print("=" * 60)

    return index


if __name__ == "__main__":
    index = main()
    print("\n✓ Search system ready!")
    print("\nYou can now use the search() function:")
    print("  results = search(index, 'your query', top_n=5)")
