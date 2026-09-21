cmake_minimum_required(VERSION 3.25)
project(web_tag_editor)

set(CMAKE_CXX_STANDARD 23)

# Find TagLib using pkg-config
find_package(PkgConfig REQUIRED)
find_package(nlohmann_json REQUIRED)
find_package(ZLIB REQUIRED)
pkg_check_modules(TAGLIB REQUIRED taglib>=2.0)

include(FetchContent)
FetchContent_Declare(
        SQLiteCpp
        GIT_REPOSITORY https://github.com/SRombauts/SQLiteCpp.git
        GIT_TAG 3.3.3
)
FetchContent_MakeAvailable(SQLiteCpp)

# Your executable
add_executable(web_tag_editor src/main.cpp
        include/rte.h
        include/interface.h
        src/format_handlers/flac.h
        src/format_handlers/flac.cpp
        src/format_handlers/factory.h
        src/format_handlers/factory.cpp
        src/format_handlers/mpeg.cpp
        src/format_handlers/mpeg.h
        src/format_handlers/mpeg4.cpp
        src/format_handlers/mpeg4.h
        src/format_handlers/oggTag.cpp
        src/format_handlers/oggTag.h
        src/format_handlers/oggVorbis.cpp
        src/format_handlers/oggVorbis.h
        src/format_handlers/oggFlac.cpp
        src/format_handlers/oggFlac.h
        src/format_handlers/oggOpus.cpp
        src/format_handlers/oggOpus.h
        src/format_handlers/oggSpeex.cpp
        src/format_handlers/oggSpeex.h
        src/tagMapping.cpp
        include/music.h
        include/history.h
        src/history.cpp
        include/utils.h
        src/utils.cpp
)

# Include headers
target_include_directories(web_tag_editor PRIVATE ${TAGLIB_INCLUDE_DIRS})
target_link_libraries(web_tag_editor PRIVATE ${TAGLIB_LIBRARIES})
target_link_libraries(web_tag_editor PRIVATE nlohmann_json::nlohmann_json)
target_link_libraries(web_tag_editor PRIVATE SQLiteCpp sqlite3 pthread dl)
target_link_libraries(web_tag_editor PRIVATE ZLIB::ZLIB)

# Compiler flags (if needed)
target_compile_options(web_tag_editor PRIVATE ${TAGLIB_CFLAGS_OTHER})
target_compile_definitions(web_tag_editor
        PRIVATE $<$<CONFIG:Debug>:APP_DEBUG>
)
target_compile_definitions(web_tag_editor PRIVATE CROW_ENABLE_COMPRESSION)