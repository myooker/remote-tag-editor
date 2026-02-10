cmake_minimum_required(VERSION 4.0)
project(web_tag_editor)

set(CMAKE_CXX_STANDARD 23)

# Find TagLib using pkg-config
find_package(PkgConfig REQUIRED)
find_package(nlohmann_json REQUIRED)
pkg_check_modules(TAGLIB REQUIRED taglib)

# Your executable
add_executable(web_tag_editor src/main.cpp
        include/program.h
        include/musicTagHandler.h
        include/format_handlers/flacTagHandler.h
        src/format_handlers/flacTagHandler.cpp
        include/musicTagHandlerFactory.h
        src/musicTagHandlerFactory.cpp
        src/format_handlers/mpegTagHandler.cpp
        include/format_handlers/mpegTagHandler.h
        src/format_handlers/mpeg4TagHandler.cpp
        include/format_handlers/mpeg4TagHandler.h
        include/scopeTimer.h
        src/format_handlers/oggTagHandler.cpp
        include/format_handlers/oggTagHandler.h
        src/format_handlers/oggVorbisTagHandler.cpp
        include/format_handlers/oggVorbisTagHandler.h
        src/format_handlers/oggFlacTagHandler.cpp
        include/format_handlers/oggFlacTagHandler.h
        src/format_handlers/oggOpusTagHandler.cpp
        include/format_handlers/oggOpusTagHandler.h
        src/format_handlers/oggSpeexTagHandler.cpp
        include/format_handlers/oggSpeexTagHandler.h)

# Include headers
target_include_directories(web_tag_editor PRIVATE ${TAGLIB_INCLUDE_DIRS})
target_link_libraries(web_tag_editor PRIVATE nlohmann_json::nlohmann_json)

# Link libraries
target_link_libraries(web_tag_editor PRIVATE ${TAGLIB_LIBRARIES})

# Compiler flags (if needed)
target_compile_options(web_tag_editor PRIVATE ${TAGLIB_CFLAGS_OTHER})
target_compile_definitions(web_tag_editor
        PRIVATE $<$<CONFIG:Debug>:APP_DEBUG>
)



