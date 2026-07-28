Lets fully rewrite my frontend. You're my frontender, I do backend.

Use `api.md` for api reference. Add a placeholder for /api/getalbumcover (I will implement that on my backend)

Create a separate folder for new frontend. do not touch git at all, i will take care of it.

The frotnend should have the same layout as our version right now. I want you to use more modern stack, modern ui design (for example radix ui, ShadCN UI). When a user going down to the directory, it should adds to the URL (for example tag.somedomain.com/aritst_1/album_2, to easier copy and paste for friends, like fix this folders tags). Use the same logo.svg.

# File manager

Directory and files view should have sorting by alphabet and type (add arrows indicating current sorting). Add navigation shortcuts to it:
- ctrl-f - focus search bar
- ctrl-a - selects music files only

Implement mouse buttons like in file manager:
- mouse button back - go to the previous directory? (or maybe other mechanism)
- mouse button forward - go back to the previous deep directory
Make folder view lean, it should handle a lot of objects.

Duplicate navigation buttons above file panel (back, forward, update).

Add RMB to open context menu. If a mouse cursor is above a folder/file it should select this folder/file and drop menu with the following commands:
- New folder
- Rename
If RMB is used somewhere else, do not show default browser context menu.

# Tag panel

RMB usage. It should show menu that with the following options:
- Add new tag field
- Remove current tag field (if clicked on tag field)

## One music file

Add placeholder for albumcover of a music file. It should be above all tags.

It should use /api/tag (see more api.md). All tags are in separate textboxes with red crosses to entirely delete tag field (ask before doing deletion). For example:
TAG_NAME   X
| TEXT BOX |

If a frontend gets an array of tagfiels, such as multi-valued tags as ARTISTS, ALBUMARTISTS and etc. They should be represented as follows:
TAG_NAMES
| TEXT BOX 1 X*| *add hidden cross that appears on hover
| TEXT BOX 1 X*| *same

## Multiple music files

Still have a placeholder for a music files.

If tags are different across more than one selected files, show <keep> placeholder. When click on it, show drop down menu with all tags across selected files. For example:
TITLE   X
| <keep> |
---------- ---
| title1 |   |
----------   |
| title2 |    - drop down menu, click on <keep>
----------   |
| title3 |   |
---------- ---
etc...
If a user selects any of these, it should replace <keep> with selected option, and do not write - show save button and only after that call api to edit tags of selected files.

## Tag History 

Additional panel to the Tag Panel -- should appear beside on the left to clearly see current tags and history.

If you can remember old chats - use the same logic to implement tag history.

For reference use api.md, or ask me to clarify things.

## Adding new tag fields

I have tag normalization table. You can get it from GET /api/tag-registry. Use this tag-registry to suggest tags for a user.