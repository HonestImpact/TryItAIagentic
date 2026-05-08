# Setup notes

This repo was originally built on a machine where ~/Development/ 
existed as the parent directory. On the current Mac Mini setup, 
the equivalent is ~/dev/ (which is itself a symlink to 
/Volumes/ExtStorage/dev/).

Before running or updating this code, you'll need to either:

1. Create a symlink: `ln -s /Volumes/ExtStorage/dev ~/Development`
2. Update hardcoded paths in [list the files where they appear]
   to use ~/dev/ or an environment variable

Files with hardcoded ~/Development paths:
- path/to/file1.js
- path/to/file2.json
- ...

(Generated [date] from grep output during machine consolidation.)
