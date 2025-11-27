from django.contrib import admin
from .models import Todo

@admin.register(Todo)
class TodoAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_completed', 'due_date', 'created_at')
    list_filter = ('is_completed', 'created_at')
    search_fields = ('title', 'description')
    date_hierarchy = 'created_at'
    fieldsets = (
        ('Todo Information', {
            'fields': ('title', 'description')
        }),
        ('Dates', {
            'fields': ('due_date', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_completed',)
        }),
    )
    readonly_fields = ('created_at', 'updated_at')
