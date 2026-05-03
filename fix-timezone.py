import os
import re

def get_relative_path(from_file, to_file):
    from_dir = os.path.dirname(from_file)
    rel = os.path.relpath(to_file, from_dir)
    rel = rel.replace('\\', '/')
    if not rel.startswith('.'):
        rel = './' + rel
    if rel.endswith('.js'):
        rel = rel[:-3]
    return rel

def main():
    src_dir = os.path.abspath('src')
    utils_file = os.path.abspath('src/lib/utils.js')
    
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if not (file.endswith('.jsx') or file.endswith('.js')):
                continue
            
            filepath = os.path.join(root, file)
            # Skip utils itself
            if filepath == utils_file:
                continue
                
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find exact "new Date()"
            if 'new Date()' in content:
                # Replace with getNowVN()
                new_content = content.replace('new Date()', 'getNowVN()')
                
                # Check if getNowVN is imported
                if 'getNowVN' not in content:
                    # Inject import
                    rel_path = get_relative_path(filepath, utils_file)
                    
                    # Try to find if there is an existing import from utils
                    if re.search(r"import\s+{([^}]*)}\s+from\s+['\"]" + re.escape(rel_path) + r"['\"]", new_content):
                        # Add getNowVN to existing import
                        new_content = re.sub(
                            r"(import\s+{)([^}]*)(\}\s+from\s+['\"]" + re.escape(rel_path) + r"['\"])",
                            r"\1\2, getNowVN\3",
                            new_content
                        )
                    else:
                        # Find the last import line
                        imports = list(re.finditer(r"^import\s+.*$", new_content, re.MULTILINE))
                        import_stmt = f"import {{ getNowVN }} from '{rel_path}'\n"
                        if imports:
                            last_import = imports[-1]
                            insert_pos = last_import.end() + 1
                            new_content = new_content[:insert_pos] + import_stmt + new_content[insert_pos:]
                        else:
                            new_content = import_stmt + new_content
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")

if __name__ == '__main__':
    main()