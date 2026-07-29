import os
import zipfile
import datetime
import glob


def backup_database(base_dir=None, keep_max=30):
    """
    Creates a timestamped ZIP backup of homeroom.db inside the backups/ folder.
    Retains up to keep_max latest backups and cleans up older ones.
    """
    if not base_dir:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    db_path = os.path.join(base_dir, 'homeroom.db')
    if not os.path.exists(db_path):
        print("  Backup skipped: homeroom.db does not exist yet.")
        return None

    backups_dir = os.path.join(base_dir, 'backups')
    os.makedirs(backups_dir, exist_ok=True)

    timestamp = datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    backup_filename = f"homeroom_backup_{timestamp}.zip"
    backup_path = os.path.join(backups_dir, backup_filename)

    try:
        with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(db_path, arcname='homeroom.db')
        print(f"  Created DB backup: {backup_filename}")

        # Rotate backups (keep last keep_max)
        all_backups = sorted(glob.glob(os.path.join(backups_dir, 'homeroom_backup_*.zip')))
        if len(all_backups) > keep_max:
            to_remove = all_backups[:-keep_max]
            for old_b in to_remove:
                try:
                    os.remove(old_b)
                    print(f"  Rotated old backup: {os.path.basename(old_b)}")
                except Exception:
                    pass

        return backup_path
    except Exception as e:
        print(f"  Failed to backup database: {e}")
        return None


if __name__ == '__main__':
    backup_database()
