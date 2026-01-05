cmake_minimum_required(VERSION 4.0)
project(web_tag_editor)

set(CMAKE_CXX_STANDARD 20)

# Find TagLib using pkg-config
find_package(PkgConfig REQUIRED)
find_package(nlohmann_json REQUIRED)
pkg_check_modules(TAGLIB REQUIRED taglib)

# Your executable
add_executable(web_tag_editor main.cpp
        FLAC/flac.cpp
        FLAC/flac.h
        MPEG/mpeg.cpp
        MPEG/mpeg.h
        program.h)

# Include headers
target_include_directories(web_tag_editor PRIVATE ${TAGLIB_INCLUDE_DIRS})
target_link_libraries(web_tag_editor PRIVATE nlohmann_json::nlohmann_json)

# Link libraries
target_link_libraries(web_tag_editor PRIVATE ${TAGLIB_LIBRARIES})

# Compiler flags (if needed)
target_compile_options(web_tag_editor PRIVATE ${TAGLIB_CFLAGS_OTHER})



