#!/bin/bash
# EduSafa Learning - Database Path Migration Script
# هذا السكربت يقوم بتحديث جميع المسارات القديمة إلى الجديدة في جميع الملفات

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   EduSafa Learning - Batch Path Updater                 ║"
echo "║   تحديث جماعي لمسارات قاعدة البيانات                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Counter
UPDATED=0
SKIPPED=0

# Function to update a file
update_file() {
    local file=$1
    local count=$(grep -c "EduSafa_Learning/database" "$file" 2>/dev/null || echo 0)
    
    if [ "$count" -gt 0 ]; then
        echo -e "${YELLOW}📝 Updating: ${NC}$file ($count references)"
        
        # Add import statement if not exists
        if ! grep -q "import { SYS, EDU, COMM }" "$file" && ! grep -q "import { SYS }" "$file" && ! grep -q "import { EDU }" "$file"; then
            # Check if there's an import from firebase/database
            if grep -q "import {.*} from 'firebase/database'" "$file"; then
                # Add import after firebase/database import
                sed -i "/import {.*} from 'firebase\/database'/a import { SYS, EDU, COMM } from '../../constants/dbPaths';" "$file"
            elif grep -q "import {.*} from \"firebase/database\"" "$file"; then
                sed -i "/import {.*} from \"firebase\/database\"/a import { SYS, EDU, COMM } from '../../constants/dbPaths';" "$file"
            else
                # Add import after firebase import
                sed -i "/import { db } from/a import { SYS, EDU, COMM } from '../../constants/dbPaths';" "$file"
            fi
            echo "   ✅ Added import statement"
        fi
        
        # Replace common paths
        # Note: This is a simplified version - full replacement requires manual review
        sed -i 's|EduSafa_Learning/database/users|sys/users|g' "$file"
        sed -i 's|EduSafa_Learning/database/classes|edu/sch/classes|g' "$file"
        sed -i 's|EduSafa_Learning/database/settings|sys/system/settings|g' "$file"
        sed -i 's|EduSafa_Learning/database/announcements|sys/announcements|g' "$file"
        sed -i 's|EduSafa_Learning/database/activities|sys/maintenance/activities|g' "$file"
        
        UPDATED=$((UPDATED + 1))
        echo -e "${GREEN}   ✓ Updated${NC}"
    else
        SKIPPED=$((SKIPPED + 1))
    fi
}

echo "🔍 Searching for files to update..."
echo ""

# Find all TypeScript and TSX files
find pages/ components/ -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
    update_file "$file"
done

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    Summary                               ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo -e "║   Files Updated:  ${GREEN}$UPDATED${NC}${NC}                                ║"
echo -e "║   Files Skipped:  ${YELLOW}$SKIPPED${NC}${NC}                                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "⚠️  IMPORTANT: This script performs basic replacements."
echo "    Manual review is required to ensure correct path mapping."
echo ""
echo "📝 Next steps:"
echo "   1. Review updated files"
echo "   2. Replace string literals with constants from dbPaths.ts"
echo "   3. Test all features"
