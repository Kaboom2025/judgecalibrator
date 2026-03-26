from setuptools import setup, find_packages

setup(
    name="judgecalib",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "litellm>=1.0",
        "numpy>=1.21",
        "scipy>=1.7",
        "pydantic>=2.0",
        "typer>=0.9",
        "rich>=13.0",
        "datasets>=2.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0",
            "pytest-cov>=4.0",
            "pytest-asyncio>=0.21",
            "black",
            "ruff",
        ]
    },
    entry_points={
        "console_scripts": [
            "judgecalib=judgecalib.output.cli:app",
        ]
    },
    python_requires=">=3.9",
)
