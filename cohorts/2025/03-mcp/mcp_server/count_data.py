from main import get_page_content


def count_word_data():
    url = "https://datatalks.club/"
    content = get_page_content.fn(url)

    # Count occurrences of "data" (case-insensitive)
    count = content.lower().count("data")

    print(f"URL: {url}")
    print(f"Total characters: {len(content)}")
    print(f"Occurrences of 'data' (case-insensitive): {count}")

    return count


if __name__ == "__main__":
    count_word_data()
