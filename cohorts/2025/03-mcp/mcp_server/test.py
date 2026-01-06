from main import get_page_content


def test_minsearch():
    url = "https://github.com/alexeygrigorev/minsearch"
    content = get_page_content.fn(url)
    print(f"Content length: {len(content)}")
    print("Content start:")
    print(content[:200])


if __name__ == "__main__":
    test_minsearch()
