package fr.kouboy.atlaskarst;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Pont minimal vers le sélecteur de documents Android. Les carnets restent des
 * fichiers ordinaires choisis par l'utilisateur : aucune permission de stockage
 * étendue ni dossier imposé n'est nécessaire.
 */
@CapacitorPlugin(name = "CarnetFiles")
public class CarnetFilesPlugin extends Plugin {
    @PluginMethod
    public void save(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("filename", "carnet.atlas"));
        startActivityForResult(call, intent, "saveCarnetResult");
    }

    @ActivityCallback
    private void saveCarnetResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Uri uri = result.getData() == null ? null : result.getData().getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            call.reject("Enregistrement du carnet annulé");
            return;
        }
        try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "w")) {
            if (output == null) throw new IllegalStateException("Document Android inaccessible");
            output.write(call.getString("content", "").getBytes(StandardCharsets.UTF_8));
            JSObject payload = new JSObject();
            payload.put("uri", uri.toString());
            call.resolve(payload);
        } catch (Exception error) {
            call.reject("Écriture du carnet impossible", error);
        }
    }

    @PluginMethod
    public void pick(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        // Les fournisseurs Android ne savent pas tous associer l'extension
        // .atlas à son MIME. Le format sera validé côté JavaScript après lecture.
        intent.setType("*/*");
        startActivityForResult(call, intent, "pickCarnetResult");
    }

    @ActivityCallback
    private void pickCarnetResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Uri uri = result.getData() == null ? null : result.getData().getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            call.reject("Ouverture du carnet annulée");
            return;
        }
        int maxBytes = call.getInt("maxBytes", 16 * 1024 * 1024);
        try (InputStream input = getContext().getContentResolver().openInputStream(uri);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) throw new IllegalStateException("Document Android inaccessible");
            byte[] buffer = new byte[8192];
            int read, total = 0;
            while ((read = input.read(buffer)) != -1) {
                total += read;
                if (total > maxBytes) throw new IllegalArgumentException("Ce fichier dépasse la limite de 64 Mo prévue pour un instantané local.");
                output.write(buffer, 0, read);
            }
            JSObject payload = new JSObject();
            payload.put("name", displayName(uri));
            payload.put("content", output.toString(StandardCharsets.UTF_8.name()));
            payload.put("size", total);
            call.resolve(payload);
        } catch (Exception error) {
            call.reject("Lecture du carnet impossible", error);
        }
    }

    private String displayName(Uri uri) {
        try (Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int column = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (column >= 0) return cursor.getString(column);
            }
        } catch (Exception ignored) { }
        return "carnet.atlas";
    }
}
