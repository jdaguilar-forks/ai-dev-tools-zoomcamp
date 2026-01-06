from fastmcp import FastMCP
import requests

mcp = FastMCP("Demo 🚀")


@mcp.tool
def get_page_content(url: str) -> str:
    """Get the content of a web page as markdown using Jina Reader.

    Args:
        url: The URL of the web page to fetch.
    """
    jina_url = f"https://r.jina.ai/{url}"
    response = requests.get(jina_url)
    return response.text


@mcp.tool
def count_word_in_url(url: str, word: str, case_sensitive: bool = False) -> dict:
    """Count how many times a word appears in a web page.

    Args:
        url: The URL of the web page to fetch.
        word: The word to count.
        case_sensitive: Whether to perform case-sensitive search (default: False).

    Returns:
        A dictionary with the count and additional information.
    """
    # Get the page content using Jina Reader
    jina_url = f"https://r.jina.ai/{url}"
    response = requests.get(jina_url)
    content = response.text

    # Count occurrences
    if case_sensitive:
        count = content.count(word)
    else:
        count = content.lower().count(word.lower())

    return {
        "url": url,
        "word": word,
        "count": count,
        "case_sensitive": case_sensitive,
        "content_length": len(content),
    }


@mcp.tool
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b


if __name__ == "__main__":
    mcp.run()
