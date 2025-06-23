# project

## Roadmap

The CLI should list the scripts you have from the JSON, ask if you want to create a script, run a script, update a script, delete a script or quit.

- If you want to run a script, it gives you the full path if not global and gives you the command to run if global
- If you want to edit a script, it gives you the option of adding or removing from the path, and prints out the full path of the script
- If you want to delete a script, it asks for confirmation for also deleting the file. If not given, it just deletes the script from the json.
- If you want to create a script, it asks for the name of the script, creates a folder which is combination of name and id, then creates a bash script.

## Adding cron jobns

You can programmatically add a cron job in Linux by using the `crontab` command-line tool or scripting languages like Python or Bash.

**Method 1: Using `crontab`**

1. Open the crontab file in the editor: `crontab -e`
2. Add the desired cron job:

```bash
minute hour day month day_of_week command_to_run
```

Example:

```bash
0 12 * * * /path/to/your/script.sh
```

This will run the script at 12:00 PM every day.

To add this programmatically, you can use a tool like `crontab -l` to list all existing cron jobs and then append the new one using `>>`:

```bash
crontab -l >> /etc/crontabs/your_user_name
```

Replace `/etc/crontabs/your_user_name` with the actual path where your crontab file is stored.

**Method 2: Using Python**

You can use Python to add a cron job programmatically. Here's an example script:

```python
import subprocess

def add_cron_job(schedule, command):
    # Get the current user name and home directory
    user_name = subprocess.check_output(['id', '-un']).decode('utf-8')
    home_dir = subprocess.check_output(['pwd']).decode('utf-8')

    # Create a new crontab file
    with open('/etc/crontabs/' + user_name, 'a') as f:
        f.write(schedule + '\n' + command)

# Example usage:
add_cron_job('* * * * * /path/to/your/script.sh', '/bin/sh -c "your_command_here'")
```

This script uses the `subprocess` module to get the current user name and home directory, then creates a new crontab file using `>>`.

**Method 3: Using Bash**

You can use Bash scripting to add a cron job programmatically. Here's an example:

```bash
#!/bin/bash

# Get the current user name and home directory
user_name=$(id -un)
home_dir=$(pwd)

# Create a new crontab file
echo "$user_name" > /etc/crontabs/$user_name

# Append the desired cron job
echo "* * * * * /path/to/your/script.sh" >> /etc/crontabs/$user_name

# Save and close the editor
crontab -e
```

This script creates a new crontab file using `>>` and then appends the desired cron job.

Remember to replace `/path/to/your/script.sh` with the actual path to your script. Also, be aware of security considerations when adding cron jobs programmatically!
